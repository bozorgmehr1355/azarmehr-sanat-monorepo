/**
 * Webhook Agent v1.5 — Hybrid Router (Phase 1 + Phase 2)
 * =======================================================
 * POST /api/webhook — دریافت پیام از UltraMsg و پاسخگویی هوشمند
 *
 * معماری (Phase 1 + 2):
 *   پیام ورودی
 *     → NormalizeMessage (channel-agnostic)
 *     → Customer Resolution (read-only)
 *     → Escalation Context (Phase 2) — active thread check
 *     → Intent Detection (_intent.js)
 *         → ESCALATION_FOLLOWUP (Phase 2)   → context capture → needs_human
 *         → GREETING / HELP        → پاسخ خودکار ساده
 *         → ESCALATION / DISSATISFACTION / REFUND_REQUEST → needs_human
 *         → BRAND_QUESTION         → جستجو در brand_knowledge
 *         → WARRANTY_QUERY         → Q&A Match / پاسخ خودکار
 *         → ORDER                  → لینک پرتال
 *         → PRICE_QUERY            → Q&A Match / پرتال (Phase 1)
 *         → CONTACT                → Q&A Match
 *         → PRODUCT_QUERY          → موتور جستجوی محصول (5 لایه)
 *     → Customer-Type Adjustments (neutral path / retail suppression)
 *     → Cooldown → ارسال → ذخیره (+ source_channel, escalation context)
 */
const { supabase, cors, formatPhone, formatPhoneInternational, sendWhatsAppMessage } = require('./_lib');
const { detectIntent, getAutoReply, normalizeText, SUPPORT_PHONE, SALES_PHONE, WEBSITE, PORTAL_URL, RETAIL_URL, detectSimpleIntent, WELCOME_SIMPLE, RETAIL_REPLY, WHOLESALE_REPLY, FALLBACK_SIMPLE } = require('./_intent');
const { askAI, searchBrandKnowledge, logSearchMiss, saveWarrantyReturn, saveOrderRequest } = require('./_ai-fallback');
const { detectAndSearchProducts } = require('./_product-detection');
const menuEngine = require('./_menu-engine');

// ── Response Model + Renderer (Channel-Agnostic, D02/D03) ────
const { ensureResponseModel } = require('../shared/response-adapter');
const { renderWhatsAppText } = require('../shared/whatsapp-text-renderer');

// ═══════════════════════════════════════════════════════════════════════════
// تنظیمات
// ═══════════════════════════════════════════════════════════════════════════
const COOLDOWN_MINUTES = 0; // No cooldown — each message gets a reply
const MAX_HUMAN_ESCALATIONS = 2;

// ─── Feature Flag (Simplified Portal Flow — WhatsApp as Acquisition Only) ─
const USE_SIMPLIFIED_FLOW = process.env.USE_SIMPLIFIED_FLOW === 'true' || false;
console.log(`[Webhook] USE_SIMPLIFIED_FLOW=${USE_SIMPLIFIED_FLOW}`);

// ─── Feature Flag (Phase 1 Router) ────────────────────────────────────────
const USE_PHASE1_ROUTER = process.env.USE_PHASE1_ROUTER === 'true' || false;

// ─── Neutral Path for Unknown Customers ───────────────────────────────────
const NEUTRAL_REPLY = 'برای اطلاعات بیشتر به فروشگاه محصولات غذایی عقرب مراجعه کنید:\nwww.scorpiongroup.ir';

// ─── PRICE_QUERY Fallback (No QA match) ────────────────────────────────────
const PRICE_QUERY_FALLBACK_REPLY = `برای اطلاع از قیمت‌ها، لطفاً در سامانه فروش عمده ثبت‌نام کنید:\n${PORTAL_URL}`;

// ─── Wholesale Price Protection ─────────────────────────────────────────────
const WHOLESALE_PORTAL_REPLY = `همکار گرامی، برای مشاهده قیمت‌های عمده و ثبت سفارشات همکاری لطفا به پرتال عمده‌فروشی ما مراجعه فرمایید:\nhttps://wholesale-portal-azure.vercel.app`;

// ─── Escalation Context (Phase 2) ──────────────────────────────────────────
const ESCALATION_WINDOW_MINUTES = 30;
const USE_PHASE2_CONTEXT = process.env.USE_PHASE2_CONTEXT === 'true' || USE_PHASE1_ROUTER;

// ─── Numbered Menu (Menu State) ────────────────────────────────────────────
// menu context = "did we recently show this customer the menu or a menu item?"
// used to decide whether a bare digit 0/1-7/9 should be treated as a menu pick
const MENU_CONTEXT_WINDOW_MINUTES = 60;
const MENU_CONTEXT_REPLY_TYPES = [
  'welcome_first', 'menu',
  'menu_wholesale', 'menu_retail', 'menu_tracking',
  'menu_warranty', 'menu_product_guide', 'menu_escalation', 'menu_purchase_guide',
];
// digit → intent sentinel (only reachable when menu context is active)
const MENU_DIGIT_MAP = {
  '0': 'MENU_ROOT',
  '1': 'MENU_WHOLESALE',
  '2': 'MENU_RETAIL',
  '3': 'MENU_CATALOG',
  '33': 'MENU_CATALOG',
  '4': 'MENU_TRACKING',
  '5': 'MENU_WARRANTY',
  '6': 'MENU_PRODUCT_GUIDE',
  '7': 'MENU_PURCHASE_GUIDE',
  '9': 'MENU_ESCALATION',
};

// ─── AI-Powered Response Helper ───────────────────────────────────────────
// تمام پاسخ‌های غیرمنو از AI عبور می‌کنند تا تجربه طبیعی و انسانی داشته باشیم.
// پارامترها:
//   messageText — متن پیام کاربر
//   phone — شماره تلفن (برای تاریخچه)
//   customerType — نوع مشتری (unknown, known_retail, known_wholesale)
//   options — context اضافی مثل products
async function aiReply(messageText, phone, customerType, options = {}) {
  const history = await getConversationHistory(phone);
  const context = {
    conversation_history: history,
    customer_type: customerType || 'unknown',
    ...options,
  };
  const result = await askAI(messageText, context);
  return { reply: result.reply, replyType: result.reply ? 'ai_gpt' : null, limitReached: result.limit_reached };
}

// ─── Intent Reply-Key Resolver (F12 fix) ───────────────────────────────────
// جایگزین شکننده‌ی intent.replace('MENU_', '') با یک mapping شفاف.
// هر intent واقعی را به کلید متناظر در getAutoReply() نگاشت می‌کند.
function resolveReplyKey(intent) {
  if (!intent) return 'FALLBACK';
  const normalized = String(intent).trim().toUpperCase();

  // نگاشت شفاف برای همه intentهای مورد پشتیبانی
  const explicitMap = {
    GREETING: 'GREETING',
    HELP: 'HELP',
    ORDER: 'ORDER',
    PRICE_QUERY: 'PRICE_QUERY',
    PRODUCT_QUERY: 'PRODUCT_QUERY',
    CONTACT: 'CONTACT',
    EDUCATION: 'EDUCATION',
    MENU_EDUCATION: 'EDUCATION',
    FALLBACK: 'FALLBACK',
    AI_FALLBACK: 'FALLBACK',
    MENU_ORDER: 'ORDER',
    MENU_PRICE: 'PRICE_QUERY',
    MENU_PRODUCT: 'PRODUCT_QUERY',
    MENU_CONTACT: 'CONTACT',
    MENU_HELP: 'HELP',
    MENU_GREETING: 'GREETING',
    MENU_FALLBACK: 'FALLBACK',
  };

  if (explicitMap[normalized]) {
    return explicitMap[normalized];
  }

  // برای MENU_*هایی که در explicitMap نیستند، پیشوند را حذف کن
  if (normalized.startsWith('MENU_')) {
    return normalized.slice(5);
  }

  return normalized;
}

// ─── Q&A Match Integration ────────────────────────────────────────────────
const QA_MATCH_API_URL = process.env.QA_MATCH_API_URL || '';
const QA_MATCH_TIMEOUT = 5000; // 5 seconds max

/**
 * تلاش برای دریافت پاسخ از Q&A Match Engine (POST /api/qa-match)
 * در صورت خطا یا عدم تشخیص intent مطمئن → null (fallback به legacy)
 */
async function askQAMatch(question) {
  if (!QA_MATCH_API_URL || !question) return null;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), QA_MATCH_TIMEOUT)
  );

  try {
    const response = await Promise.race([
      fetch(QA_MATCH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      }),
      timeoutPromise,
    ]);

    if (!response.ok) {
      console.warn(`[QA-Match] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.ok || !data.intent) return null;

    console.log(`[QA-Match] Match: ${data.intent} (conf=${data.confidence})`);

    const MIN_CONFIDENCE = 30;
    if (data.confidence < MIN_CONFIDENCE) {
      console.log(`[QA-Match] ⚠️ Rejected: confidence ${data.confidence} < ${MIN_CONFIDENCE} — falling back`);
      return null;
    }

    return data.answer;
  } catch (err) {
    console.warn(`[QA-Match] ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VERSION for deployment tracking
const VERSION = "2026-07-06-1";

// ═══════════════════════════════════════════════════════════════════════════
// ۱. توابع کمکی
// ═══════════════════════════════════════════════════════════════════════════

/**
 * نرمال‌سازی پیام ورودی (channel-agnostic contract)
 * حداقل فیلدها: channel, normalized_user_key, text
 * فیلدهای اختیاری: message_type, timestamp
 */
function normalizeMessage(channel, senderRaw, messageText) {
  const rawDigits = String(senderRaw).replace('@c.us', '').replace(/\D/g, '');
  return {
    channel,
    normalized_user_key: formatPhone(rawDigits),
    text: messageText || '',
    message_type: 'text',
    timestamp: new Date().toISOString(),
  };
}

/**
 * جستجوی customer در دیتابیس بر اساس normalized_user_key
 * فقط read-only — route را تغییر نمی‌دهد، فقط presentation را adjust می‌کند
 * @returns {{ status: 'known_wholesale'|'known_retail'|'unknown', sales_segment: string|null }}
 */
async function resolveCustomer(normalizedKey) {
  try {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('sales_segment')
      .eq('phone', normalizedKey)
      .maybeSingle();

    if (error || !data) return { status: 'unknown', sales_segment: null };
    if (data.sales_segment === 'retail') return { status: 'known_retail', sales_segment: 'retail' };
    return { status: 'known_wholesale', sales_segment: data.sales_segment || 'wholesale' };
  } catch (err) {
    console.warn(`[Customer] Lookup error for ${normalizedKey}: ${err.message}`);
    return { status: 'unknown', sales_segment: null };
  }
}

/**
 * جستجوی مشتری در crm_customers بر اساس شماره تلفن (phone / mobile / whatsapp)
 * @returns {number|null} crm_customers.id یا null اگر پیدا نشد
 */
async function findCrmCustomerByPhone(phone) {
  if (!phone) return null;
  try {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('id')
      .or(`phone.eq.${phone},mobile.eq.${phone},whatsapp.eq.${phone}`)
      .maybeSingle();
    if (error || !data) return null;
    return data.id;
  } catch (err) {
    console.warn('[CustomerLink] Phone lookup error:', err.message);
    return null;
  }
}

/**
 * اتصال خودکار conversation به crm_customers (در صورت پیدا شدن مشتری)
 * از conversation_customer_links junction table استفاده می‌کند.
 * non-blocking: خطا break نمی‌کند.
 */
async function autoLinkCustomerToConversation(conversationId, cleanPhone) {
  if (!conversationId || !cleanPhone) return;
  try {
    const crmCustomerId = await findCrmCustomerByPhone(cleanPhone);
    if (!crmCustomerId) return; // مشتری پیدا نشد — link نمی‌زنیم

    const { error } = await supabase
      .from('conversation_customer_links')
      .upsert({
        conversation_id: conversationId,
        crm_customer_id: crmCustomerId,
        link_source: 'auto_webhook',
      }, { onConflict: 'conversation_id,crm_customer_id' });

    if (error) {
      console.warn('[CustomerLink] Upsert error:', error.message);
    } else {
      console.log(`[CustomerLink] Linked conv ${conversationId} → crm_customer ${crmCustomerId} (phone: ${cleanPhone})`);
    }
  } catch (err) {
    console.warn('[CustomerLink] Non-critical error:', err.message);
  }
}

// --------------- PATCH: CATALOG RESOLVER ---------------

/** ایمن‌ترین JSON.parse */
function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

/**
 * دریافت دسته‌های کاتالوگ متصل به یک نود منو
 */
async function getCatalogSections(menuNodeId) {
  const { data, error } = await supabase
    .from('crm_catalog_sections')
    .select('id, title, description, image_url, sort_order')
    .eq('parent_node_id', menuNodeId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('[Catalog] Error fetching catalog sections:', error);
    return null;
  }
  return data || [];
}

/**
 * دریافت آیتم‌های یک دسته با فیلتر audience/channel
 */
async function getCatalogItems(sectionId, parentItemId = null, customerSegment = 'all') {
  let query = supabase
    .from('crm_catalog_items')
    .select(`
      id, title, subtitle, description, image_url,
      price_text, cta_text, cta_url,
      secondary_cta_text, secondary_cta_url,
      buttons_json, item_type, audience_scope,
      channel_scope, visibility_rules,
      sort_order, parent_id, section_id
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (sectionId) query = query.eq('section_id', sectionId);
  if (parentItemId) { query = query.eq('parent_id', parentItemId); }
  else { query = query.is('parent_id', null); }

  // فیلتر audience
  if (customerSegment === 'wholesale') {
    query = query.or('audience_scope.eq.all,audience_scope.eq.wholesale');
  } else if (customerSegment === 'retail') {
    query = query.or('audience_scope.eq.all,audience_scope.eq.retail');
  } else {
    query = query.eq('audience_scope', 'all');
  }
  // فیلتر کانال
  query = query.or('channel_scope.eq.all,channel_scope.eq.whatsapp');

  const { data, error } = await query;
  if (error) {
    console.error('[Catalog] Error fetching catalog items:', error);
    return null;
  }

  // فیلتر visibility_rules (ایمن)
  return (data || []).filter(item => {
    if (customerSegment !== 'retail') return true;
    const vr = item.visibility_rules;
    if (!vr) return true;
    if (typeof vr === 'object' && vr.hide_from_retail === true) return false;
    return true;
  });
}

/**
 * فرمت یک آیتم کاتالوگ به صورت متن (برای خروجی WhatsApp)
 */
function formatCatalogItemAsText(item) {
  if (!item) return '';
  let msg = '';
  if (item.title) msg += `\n*${item.title}*\n`;
  if (item.subtitle) msg += `${item.subtitle}\n`;
  if (item.description) msg += `${item.description}\n`;
  if (item.price_text) msg += `\n${item.price_text}\n`;
  if (item.cta_text && item.cta_url) msg += `*${item.cta_text}*: ${item.cta_url}\n`;
  if (item.secondary_cta_text && item.secondary_cta_url) msg += `*${item.secondary_cta_text}*: ${item.secondary_cta_url}\n`;

  // دکمه‌های اضافی از buttons_json
  if (item.buttons_json) {
    const btns = typeof item.buttons_json === 'string'
      ? safeJsonParse(item.buttons_json, [])
      : item.buttons_json;
    if (Array.isArray(btns)) {
      btns.forEach(b => {
        if (b?.text && b?.url) msg += `*${b.text}*: ${b.url}\n`;
      });
    }
  }
  return msg.trim();
}

/**
 * فرمت لیست آیتم‌ها به صورت منوی شماره‌دار
 */
function formatItemListAsMenu(items, customerSegment) {
  const lines = items
    .filter(i => i.audience_scope === 'all' || i.audience_scope === customerSegment)
    .map((item, idx) => `${item.sort_order || (idx + 1)}. ${item.title || 'بدون عنوان'}`);
  return `لطفاً یکی از گزینه‌های زیر را انتخاب کنید:\n${lines.join('\n')}\n0. بازگشت`;
}

/**
 * هندلر اصلی کاتالوگ — با intent_key نود منو مطابقت دارد (MENU_CATALOG)
 */
async function handleCatalogIntent(intent, customerSegment) {
  try {
    // ── منوی ریشه کاتالوگ: نمایش دسته‌ها ──
    if (intent === 'MENU_CATALOG') {
      const { data: catalogNode } = await supabase
        .from('crm_menu_nodes')
        .select('id')
        .eq('intent_key', 'MENU_CATALOG')
        .single();

      if (!catalogNode) return 'خطا در یافتن بخش محصولات.';
      const sections = await getCatalogSections(catalogNode.id);
      if (!sections || sections.length === 0) return 'متاسفانه در حال حاضر محصول یا خدماتی برای نمایش موجود نیست.';

      return 'محصولات:\n' + formatItemListAsMenu(sections, customerSegment);
    }

    // ── زیردسته یا گروه ──
    if (intent.startsWith('MENU_CATALOG_GROUP_')) {
      const groupId = intent.replace('MENU_CATALOG_GROUP_', '');
      const items = await getCatalogItems(null, groupId, customerSegment);
      if (!items || items.length === 0) return 'موردی در این دسته یافت نشد.';

      return items.map(p => formatCatalogItemAsText(p)).filter(Boolean).join('\n\n');
    }

    // ── آیتم تکی ──
    if (intent.startsWith('SHOW_CATALOG_ITEM_')) {
      const itemId = intent.replace('SHOW_CATALOG_ITEM_', '');
      const { data: item } = await supabase
        .from('crm_catalog_items')
        .select('*')
        .eq('id', itemId)
        .single();
      if (!item) return 'محصول مورد نظر یافت نشد.';
      return formatCatalogItemAsText(item);
    }

    return null;
  } catch (err) {
    console.error('[Catalog] handleCatalogIntent error:', err);
    return 'متاسفانه در پردازش کاتالوگ مشکلی پیش آمد.';
  }
}
// --------------- END: CATALOG RESOLVER ---------------

/**
 * حذف PORTAL_URL و SALES_PHONE از متن پاسخ برای مشتریان خرد
 */
function suppressWholesaleFromReply(text) {
  if (!text) return text;
  const wholesaleUrl = PORTAL_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const retailUrl = RETAIL_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const websiteRegex = WEBSITE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    // ۱) لینک عمده → لینک خرده
    .replace(new RegExp(wholesaleUrl, 'g'), RETAIL_URL)
    // ۲) نرمال‌سازی website به لینک خرده رسمی
    .replace(new RegExp(websiteRegex, 'g'), RETAIL_URL)
    // ۳) عبارات فارسی عمده‌محور → خرده‌محور
    // عمده → عمده‌فروشی آنلاین عقرب
    .replace(/پورتال عمده‌فروشی|سامانه عمده‌فروش[یش]|سامانه فروش عمده/gi, 'عمده‌فروشی آنلاین عقرب')
    // خرده → فروشگاه آنلاین عقرب
    .replace(/وب‌سایت فروش خرده|سایت خرده‌فروشی/gi, 'فروشگاه آنلاین عقرب')
    // ۴) حذف شماره فروش
    .replace(/09038883000/g, '')
    // ۵) پاکسازی فاصله و newline
    .replace(/\n{2,}/g, '\n')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * تشخیص سیگنال عمده/خرده از متن پیام (برای مشتریان ناشناس)
 * فقط conservative keyword matching — هیچ log کسب‌وکاری ندارد
 * @param {string} text — متن پیام کاربر
 * @returns {string|null} 'wholesale' | 'retail' | null
 */
function detectSegmentHint(text) {
  if (!text) return null;
  const normalized = text.replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/\u200C/g, ' ').trim();

  // کلیدواژه‌های خرده‌فروشی (اولویت با retail برای safety)
  const RETAIL_KEYWORDS = ['تکی', 'خرده', 'خونه', 'خانه', 'خانگی', 'منزل', 'یک بسته', 'یک عدد'];
  // کلیدواژه‌های عمده‌فروشی
  const WHOLESALE_KEYWORDS = ['عمده', 'همکار', 'پخش', 'نمایندگی', 'تناژ', 'فاکتور', 'حواله'];

  for (const kw of RETAIL_KEYWORDS) {
    if (normalized.includes(kw)) return 'retail';
  }
  for (const kw of WHOLESALE_KEYWORDS) {
    if (normalized.includes(kw)) return 'wholesale';
  }
  return null;
}

/**
 * تشخیص درخواست قیمت عمده/همکاری از متن پیام
 * برای محافظت در برابر افشای قیمت عمده توسط AI — جریان AI بلافاصله متوقف
 * و کاربر به پرتال عمده‌فروشی هدایت می‌شود.
 * @param {string} text — متن پیام کاربر
 * @returns {boolean}
 */
function hasWholesalePriceQuery(text) {
  if (!text) return false;
  const normalized = text.replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/\u200C/g, ' ').trim();
  const KEYWORDS = [
    'قیمت عمده', 'قیمت همکاری', 'خرید عمده', 'لیست قیمت عمده',
    'قیمت همکار', 'قیمت عمده‌فروشی', 'قیمت نمایندگی',
    'عمده چنده', 'قیمت عمده چقدره',
  ];
  return KEYWORDS.some(kw => normalized.includes(kw));
}

/**
 * جستجوی escalation فعال برای یک sender در بازه زمانی مشخص (Phase 2)
 * @returns {Promise<{id: number, message_body: string, auto_reply_type: string}|null>}
 */
async function findActiveEscalation(phone) {
  const since = new Date(Date.now() - ESCALATION_WINDOW_MINUTES * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('whatsapp_inbox')
      .select('id, message_body, auto_reply_type')
      .eq('sender_phone', phone)
      .eq('needs_human', true)
      .gte('auto_reply_at', since)
      .order('auto_reply_at', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0];
  } catch (err) {
    console.warn('[Escalation] Find error:', err.message);
    return null;
  }
}

/**
 * نرمال‌سازی ارقام فارسی/عربی به ارقام انگلیسی (برای تشخیص دستور منو)
 */
function normalizePersianDigits(str) {
  return String(str || '').replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48));
}

/**
 * آیا این اولین پیامی است که از این شماره دریافت می‌شود؟ (برای WELCOME_FIRST)
 * چون پیام فعلی پیش از این تابع در whatsapp_inbox درج شده، شمارش === ۱
 * یعنی هیچ پیام قبلی از این شماره وجود نداشته است.
 */
async function checkIsFirstTimeCustomer(phone) {
  try {
    const { count, error } = await supabase
      .from('whatsapp_inbox')
      .select('id', { count: 'exact', head: true })
      .eq('sender_phone', phone);
    if (error) {
      console.warn('[Menu] First-time check error:', error.message);
      return false;
    }
    return count === 1;
  } catch (err) {
    console.warn('[Menu] First-time check error:', err.message);
    return false;
  }
}

/**
 * بررسی اینکه آیا اخیراً منو یا یکی از آیتم‌های منو برای این شماره ارسال شده
 * (برای تشخیص اینکه یک رقم تنها باید به‌عنوان انتخاب منو تفسیر شود یا نه)
 * @returns {Promise<string|null>} auto_reply_type اخیر مرتبط با منو، یا null
 */
async function findRecentMenuContext(phone) {
  const since = new Date(Date.now() - MENU_CONTEXT_WINDOW_MINUTES * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('whatsapp_inbox')
      .select('auto_reply_type, auto_reply_at')
      .eq('sender_phone', phone)
      .eq('auto_replied', true)
      .gte('auto_reply_at', since)
      .order('auto_reply_at', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return MENU_CONTEXT_REPLY_TYPES.includes(data[0].auto_reply_type) ? data[0].auto_reply_type : null;
  } catch (err) {
    console.warn('[Menu] Context lookup error:', err.message);
    return null;
  }
}

/**
 * استخراج context حداقلی از پیام follow-up (Phase 2)
 * ارقام فارسی به انگلیسی تبدیل می‌شوند
 */
function extractEscalationContext(text) {
  const ctx = {};
  if (!text) return ctx;
  // نرمال‌سازی ارقام فارسی به انگلیسی
  const normalized = text
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/\u200C/g, ' ');
  // کد محصول: "کد ۱۲۳" یا "کد 123"
  const codeMatch = normalized.match(/کد\s*(\d+)/);
  if (codeMatch) ctx.product_code = codeMatch[1];
  // شماره سفارش: "سفارش ۴۵" یا "شماره سفارش ۴۵"
  const orderMatch = normalized.match(/(?:شماره\s*)?سفارش\s*(\d+)/);
  if (orderMatch) ctx.order_number = orderMatch[1];
  // free_text: باقیمانده متن پس از حذف matched patterns
  const cleaned = normalized
    .replace(/کد\s*\d+/g, '')
    .replace(/(?:شماره\s*)?سفارش\s*\d+/g, '')
    .replace(/[^\w\s\u0600-\u06FF]/g, '')
    .trim();
  if (cleaned && cleaned.length >= 5) ctx.free_text = cleaned.substring(0, 200);
  return ctx;
}

/**
 * بررسی fromMe
 */
function isFromSystem(payload) {
  if (payload?.data?.fromMe === true) return true;
  if (payload?.fromMe === true) return true;
  if (payload?.data?.fromMe === 'true') return true;
  if (payload?.fromMe === 'true') return true;
  return false;
}

/**
 * بررسی Cooldown
 */
async function isCooldownActive(phone) {
  const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('whatsapp_inbox')
    .select('auto_reply_at')
    .eq('sender_phone', phone)
    .eq('auto_replied', true)
    .gte('auto_reply_at', cooldownTime)
    .order('auto_reply_at', { ascending: false })
    .limit(1);
  if (error) {
    console.error('[Agent v1.5] Cooldown query error:', error.message);
    return false;
  }
  return data && data.length > 0;
}

/**
 * دریافت تاریخچه مکالمه کوتاه (۲-۳ پیام آخر)
 */
async function getConversationHistory(phone) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_inbox')
      .select('message_body, auto_reply_type, auto_reply_at')
      .eq('sender_phone', phone)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !data || data.length <= 1) return [];

    // برعکس کن (قدیمی → جدید)
    return data.reverse().map(m => ({
      role: m.auto_replied ? 'assistant' : 'user',
      content: m.message_body,
    }));
  } catch (err) {
    console.warn('[Memory] History error:', err.message);
    return [];
  }
}

/**
 * بررسی نیاز به ارجاع به انسان (Escalation)
 */
async function checkEscalation(phone) {
  try {
    // اگر پیام فعلی ESCALATION Intent داشت
    const { data, error } = await supabase
      .from('whatsapp_inbox')
      .select('id')
      .eq('sender_phone', phone)
      .eq('auto_replied', true)
      .eq('needs_human', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return false;
    return data && data.length > 0;
  } catch (err) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ۲. کلمات ایستای فارسی
// ═══════════════════════════════════════════════════════════════════════════
const PERSIAN_STOP_WORDS = [
  'چنده', 'چند', 'قیمت', 'قیمتش', 'قیمتاش', 'قیمتا', 'قیمته',
  'دارین', 'دارید', 'دارم', 'داره', 'هست', 'هستم', 'هستید',
  'هستن', 'میخوام', 'می‌خوام', 'میخوایم', 'می‌خوایم', 'میخوام',
  'بفرست', 'بده', 'بنویس', 'بگو',
  'ه', 'است', 'می', 'به', 'از', 'با', 'در', 'و', 'یا', 'که',
  'یک', 'یه', 'این', 'آن', 'اون', 'چطور', 'چطوری',
  'want', 'need', 'how', 'much', 'what', 'which', 'please',
  'price', 'cost', 'list', 'catalog', 'order', 'buy',
];

// ═══════════════════════════════════════════════════════════════════════════
// ۳. موتور جستجوی محصول
// ═══════════════════════════════════════════════════════════════════════════
async function searchProducts(searchText) {
  if (!searchText || searchText.trim().length < 2) return [];

  let text = searchText.trim();
  // Normalize
  text = text.replace(/[۰-۹]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 1776 + 48));
  text = text.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  text = text.replace(/\u200C/g, ' ').replace(/\s+/g, ' ').trim();

  const tokens = text.split(/\s+/).filter(t => t.length >= 2 && !PERSIAN_STOP_WORDS.includes(t));
  if (tokens.length === 0) return [];

  // Try full normalized text
  try {
    const { data: exactData } = await supabase
      .from('products').select('*').eq('active', true)
      .or(`name.ilike.%${text}%,description.ilike.%${text}%,category.ilike.%${text}%,packaging.ilike.%${text}%,package_size.ilike.%${text}%`)
      .limit(5);
    if (exactData && exactData.length > 0) return exactData;
  } catch (_) {}

  // Try original text
  try {
    const orig = searchText.trim();
    const { data: origData } = await supabase
      .from('products').select('*').eq('active', true)
      .or(`name.ilike.%${orig}%,description.ilike.%${orig}%,category.ilike.%${orig}%,packaging.ilike.%${orig}%,package_size.ilike.%${orig}%`)
      .limit(5);
    if (origData && origData.length > 0) return origData;
  } catch (_) {}

  // Token search
  const orConditions = [];
  const seen = new Set();
  for (const t of tokens) {
    if (seen.has(t)) continue; seen.add(t);
    orConditions.push(`name.ilike.%${t}%`);
    orConditions.push(`description.ilike.%${t}%`);
    orConditions.push(`packaging.ilike.%${t}%`);
    if (/[0-9]/.test(t)) {
      const perForm = t.replace(/[0-9]/g, ch => String.fromCharCode(1776 + parseInt(ch)));
      if (!seen.has(perForm)) { seen.add(perForm); orConditions.push(`name.ilike.%${perForm}%`); orConditions.push(`packaging.ilike.%${perForm}%`); }
    }
  }
  if (orConditions.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('products').select('*').eq('active', true)
      .or(orConditions.join(','))
      .limit(10);
    if (error) return [];

    const ranked = (data || []).map(p => ({
      ...p,
      _matchScore: tokens.filter(t => (p.name && p.name.includes(t)) || (p.description && p.description.includes(t))).length
    }));
    return ranked.sort((a, b) => b._matchScore - a._matchScore).slice(0, 5);
  } catch (err) {
    return [];
  }
}

/**
 * ساخت پاسخ ساختاریافته محصول
 */
/**
 * پاکسازی متن برای واتساپ (حذف نیم‌فاصله و کاراکترهای مشکل‌ساز)
 */
function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\u200C/g, ' ')       // نیم‌فاصله ← فاصله
    .replace(/[\u200E\u200F]/g, '') // RTL/LTR marks
    .replace(/\s+/g, ' ').trim();
}

// ── منطق لیست محصولات ──────────────────────────────────────

/**
 * نقشه کامل نام محصولات از کاتالوگ مرجع (محصولات.txt)
 *
 * کلید: ترکیب کد + وزن + بسته‌بندی برای تطبیق دقیق
 * هر محصول کاتالوگ یک مدخل دارد تا نام‌های نمایشی کاملاً یکسان باشند.
 */
const CANONICAL_CATALOG = [
  // ── خرده‌فروشی (جعبه متالایز) ─────────────────────────
  { code: '',     size: '۵۰۰ گرم', pack: 'جعبه متالایز',    name: 'چای سیاه شکسته رزین' },
  { code: '',     size: '۵۰۰ گرم',  pack: 'جعبه متالایز',    name: 'چای سیاه شکسته معطر' },
  { code: '',     size: '۵۰۰ گرم',  pack: 'جعبه متالایز',    name: 'چای سیاه باروتی زرین' },
  // ── قوطی فلزی ──────────────────────────────────────────
  { code: '',     size: '۴۵۰ گرم',  pack: 'قوطی فلزی',       name: 'چای سیاه شکسته زرین مجلسی' },
  // ── ۱۰۰ گرمی ───────────────────────────────────────────
  { code: '',     size: '۱۰۰ گرم',  pack: 'جعبه متالایز',    name: 'چای سیاه شکسته رزین' },
  { code: '',     size: '۱۰۰ گرم',  pack: 'جعبه متالایز',    name: 'چای سیاه شکسته زرین' },
  // ── کیسه‌ای ─────────────────────────────────────────────
  { code: '',     size: '۲۵ عدد',   pack: 'جعبه مقوایی',     name: 'چای سیاه کیسه‌ای' },
  // ── بسته هدیه ──────────────────────────────────────────
  { code: '666',  size: '۹۰۰ گرم',  pack: 'بسته هدیه',       name: 'چای سیاه شکسته زرین فوق ممتاز' },
  // ── عمده ۱۰ کیلویی ──────────────────────────────────────
  { code: '555',  size: '۱۰ کیلوگرم', pack: '',              name: 'چای سیاه شکسته زرین' },
  { code: '666',  size: '۱۰ کیلوگرم', pack: '',              name: 'چای سیاه شکسته زرین فوق ممتاز' },
  { code: '777',  size: '۱۰ کیلوگرم', pack: '',              name: 'چای سیاه نیم ریز زرین' },
  { code: '888',  size: '۱۰ کیلوگرم', pack: '',              name: 'چای سیاه باروتی زرین' },
  // ── ۵ کیلویی ───────────────────────────────────────────
  { code: '',     size: '۵ کیلوگرم',  pack: 'کارتن',         name: 'چای سیاه باروتی رزین' },
];

/**
 * نرمال‌سازی اندازه برای تطبیق با کاتالوگ
 */
function normalizeSize(size) {
  if (!size) return '';
  let s = sanitizeText(String(size));
  // "گرمی" ← "گرم"
  s = s.replace(/گرمی\s*$/g, 'گرم');
  // "کیلویی" ← "کیلوگرم"
  s = s.replace(/کیلویی/g, 'کیلوگرم');
  // اعداد فارسی ← انگلیسی
  s = s.replace(/[۰-۹]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 1776 + 48));
  // حذف نیم فاصله‌های اضافی
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * تطبیق محصول دیتابیس با کاتالوگ و برگرداندن نام متداول
 *
 * استراتژی:
 *  ۱. محصولات کددار (عمده): کد + وزن ملاک است
 *  ۲. محصولات بدون کد (خرده): تطبیق با کلمات کلیدی و وزن
 */
function canonicalProductName(product) {
  if (!product) return '';

  const code = product.code ? String(product.code).trim() : '';
  const size = normalizeSize(product.package_size);
  const dbName = sanitizeText(product.name || '').toLowerCase();

  // ── ۱. محصولات کددار (عمده ۵۵۵/۶۶۶/۷۷۷/۸۸۸) ──
  //     وزن + کد ملاک اصلی است. بسته‌بندی نادیده گرفته می‌شود
  if (/^[0-9]{3}$/.test(code)) {
    const matched = CANONICAL_CATALOG.find(e => {
      const eSize = normalizeSize(e.size);
      return String(e.code) === code && eSize && eSize === size;
    });
    if (matched) {
      let name = matched.name;
      if (matched.size) name += ` ${sanitizeText(matched.size)}`;
      if (matched.pack) name += ` (${sanitizeText(matched.pack)})`;
      return name;
    }
    // اگر وزن تطبیق نخورد، فقط با کد تطبیق بده
    const codeOnly = CANONICAL_CATALOG.find(e => String(e.code) === code && !e.size);
    if (codeOnly) {
      let name = codeOnly.name;
      if (product.package_size) name += ` ${sanitizeText(String(product.package_size))}`;
      return name;
    }
  }

  // ── ۲. محصولات بدون کد (خرده‌فروشی) ──
  //     تطبیق با وزن + کلمات کلیدی

  // ۲a. وزن ۵۰۰ گرم یا ۱۰۰ گرم — تطبیق با کلمات کلیدی
  const CATALOG_MAP = {
    'شکسته_رزین_500':    { name: 'چای سیاه شکسته رزین', size: '500 گرم' },
    'شکسته_معطر_500':    { name: 'چای سیاه شکسته معطر', size: '500 گرم' },
    'باروتی_زرین_500':   { name: 'چای سیاه باروتی زرین', size: '500 گرم' },
    'شکسته_رزین_100':    { name: 'چای سیاه شکسته رزین', size: '100 گرم' },
    'شکسته_زرین_100':    { name: 'چای سیاه شکسته زرین', size: '100 گرم' },
  };
  if (size === '500 گرم') {
    const entryKey = dbName.includes('معطر') ? 'شکسته_معطر_500'
                   : dbName.includes('باروتی') ? 'باروتی_زرین_500'
                   : 'شکسته_رزین_500';
    const e = CATALOG_MAP[entryKey];
    return `${e.name} ${e.size}`;
  }
  if (size === '100 گرم') {
    const entryKey = dbName.includes('زرین') ? 'شکسته_زرین_100' : 'شکسته_رزین_100';
    const e = CATALOG_MAP[entryKey];
    return `${e.name} ${e.size}`;
  }
  // ۲b. وزن ۴۵۰ گرم — زرین مجلسی
  if (size === '450 گرم') {
    return 'چای سیاه شکسته زرین مجلسی 450 گرم (قوطی فلزی)';
  }
  // ۲c. وزن ۲۵ عدد — کیسه‌ای
  if (size === '25 عدد') {
    return 'چای سیاه کیسه‌ای 25 عدد (جعبه مقوایی)';
  }
  // ۲d. وزن ۵ کیلوگرم — باروتی رزین
  if (size === '5 کیلوگرم') {
    return 'چای سیاه باروتی رزین 5 کیلوگرم';
  }
  // ۲e. وزن ۹۰۰ گرم — بسته هدیه (کد ۶۶۶)
  if (size === '900 گرم') {
    return 'چای سیاه شکسته زرین فوق ممتاز 900 گرم (بسته هدیه)';
  }

  // ── ۳. Fallback: پالایش نام دیتابیس ──
  // حذف "ی" اضافه از انتهای واحد وزن
  let result = sanitizeText(product.name || '');
  result = result.replace(/(گرم|کیلوگرم)ی/g, '$1');
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

const CATEGORY_KEYWORDS = {
  'شکسته': '%شکسته%',
  'باروتی': '%باروتی%',
  'نیم ریز': '%نیم%ریز%',
  'نیم‌ریز': '%نیم%ریز%',
  'کیسه': '%کیسه%',
  'تی بگ': '%تی%بگ%',
  'تی‌بگ': '%تی%بگ%',
};

async function getProductsByCategory(likePattern) {
  const { data, error } = await supabase
    .from('products')
    .select('name, code, packaging, package_size, base_price')
    .ilike('name', likePattern)
    .eq('active', true)
    .order('name');
  if (error) return [];
  return data || [];
}

async function getAllActiveProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('name, code, packaging, package_size, base_price')
    .eq('active', true)
    .order('name');
  if (error) return [];
  return data || [];
}

function buildCategoryMenu(customerType) {
  const isWholesale = customerType && (customerType === 'known_wholesale' || customerType === 'wholesale');
  const menu = (
    'محصولات ما در دسته‌بندی‌های زیر موجود است:\n\n' +
    '🍵 شکسته\n' +
    '🍵 باروتی\n' +
    '🍵 نیم‌ریز\n' +
    '🍵 کیسه‌ای (تی‌بگ)\n\n' +
    'نام دسته مورد نظر را بنویسید تا لیست کامل آن را برایتان ارسال کنم.\n' +
    'یا برای مشاهده همه محصولات بنویسید: همه\n'
  );
  if (isWholesale) {
    return menu + `💰 سامانه فروش عمده:\n${PORTAL_URL}`;
  }
  return menu + `🛍️ فروشگاه آنلاین عقرب:\n🌐 ${RETAIL_URL}`;
}

/**
 * تشخیص محصول عمده از روی متادیتا (کد، بسته‌بندی، دسته‌بندی)
 * محصولات عمده شامل کدهای 555, 666, 777, 888 و سایز 10 کیلوگرم هستند
 */
function isWholesaleProduct(product) {
  if (!product) return false;
  if (product.code && ['555', '666', '777', '888'].includes(String(product.code).trim())) return true;
  if (product.package_size && /^\s*10\s*(?:kg|KG|Kg|کیلو|کيلو)/.test(String(product.package_size))) return true;
  if (product.packaging && /عمده|واحده/i.test(String(product.packaging))) return true;
  if (product.category && /عمده/i.test(String(product.category))) return true;
  return false;
}

function buildProductListText(products, title, customerType) {
  if (!products || products.length === 0) {
    return 'در این دسته محصولی یافت نشد.';
  }
  const isWholesaleCustomer = customerType === 'known_wholesale' || customerType === 'wholesale';
  const retailProducts = products.filter(p => !isWholesaleProduct(p));
  const wholesaleProducts = products.filter(p => isWholesaleProduct(p));

  let text = `${title}\n${'─'.repeat(20)}\n\n`;

  // ── محصولات خرده‌فروشی ──
  if (retailProducts.length > 0) {
    if (wholesaleProducts.length > 0) text += '🛍️ محصولات خرده‌فروشی:\n\n';
    retailProducts.forEach((p, i) => {
      const name = canonicalProductName(p);
      const code = p.code ? ` | کد: ${sanitizeText(String(p.code))}` : '';
      const pkg = p.packaging ? ` | ${sanitizeText(p.packaging)}` : '';
      const size = p.package_size ? ` ${sanitizeText(String(p.package_size))}` : '';
      text += `${i + 1}. ${name}${code}${size}${pkg}\n`;
      if (!isWholesaleCustomer && p.base_price != null) {
        text += `   💰 قیمت: ${Number(p.base_price).toLocaleString('fa-IR')} ریال\n`;
      }
    });
  }

  // ── محصولات عمده ──
  if (wholesaleProducts.length > 0) {
    if (retailProducts.length > 0) text += '\n';
    text += '📦 محصولات عمده:\n\n';
    wholesaleProducts.forEach((p, i) => {
      const name = canonicalProductName(p);
      const code = p.code ? ` (کد: ${sanitizeText(String(p.code))})` : '';
      text += `${i + 1}. ${name}${code}\n`;
    });
  }

  // ── لینک انتهایی (فقط یک لینک) ──
  text += '\n';
  if (isWholesaleCustomer || wholesaleProducts.length > 0) {
    text += `💰 برای اطلاع از قیمت‌ها و ثبت سفارش عمده:\n${PORTAL_URL}`;
  } else {
    text += `🛍️ خرید از فروشگاه آنلاین عقرب:\n🌐 ${RETAIL_URL}`;
  }

  return text;
}

function buildProductReply(products, customerType) {
  if (!products || products.length === 0) {
    return 'متأسفانه محصولی با این مشخصات یافت نشد. لطفاً نام محصول را دقیق‌تر وارد کنید.';
  }

  const isWholesaleCustomer = customerType === 'known_wholesale' || customerType === 'wholesale';
  let text = '';
  let hasWholesaleProduct = false;

  if (products.length === 1) {
    const p = products[0];
    const isWholesaleProd = isWholesaleProduct(p);
    if (isWholesaleProd) hasWholesaleProduct = true;
    text += canonicalProductName(p);
    if (p.code) text += ` (کد: ${sanitizeText(String(p.code))})`;
    text += '\n';
    // قیمت فقط برای خرده‌فروش + محصول غیرعمده
    if (!isWholesaleCustomer && !isWholesaleProd && p.base_price != null) {
      text += `💰 قیمت: ${Number(p.base_price).toLocaleString('fa-IR')} ریال\n`;
    }
    if (isWholesaleProd && p.packaging) {
      text += `📦 ${sanitizeText(p.packaging)}\n`;
    }
  } else {
    // چند محصول — جدا کردن عمده/خرده
    const retail = products.filter(p => !isWholesaleProduct(p));
    const wholesale = products.filter(p => isWholesaleProduct(p));
    if (wholesale.length > 0) hasWholesaleProduct = true;

    let idx = 1;
    if (retail.length > 0) {
      if (wholesale.length > 0) text += '🛍️ خرده‌فروشی:\n\n';
      retail.forEach(p => {
        text += `${idx++}. ${canonicalProductName(p)}`;
        if (p.code) text += ` (کد: ${sanitizeText(String(p.code))})`;
        text += '\n';
        if (!isWholesaleCustomer && p.base_price != null) {
          text += `   💰 قیمت: ${Number(p.base_price).toLocaleString('fa-IR')} ریال\n`;
        }
      });
    }
    if (wholesale.length > 0) {
      if (retail.length > 0) text += '\n';
      text += '📦 عمده:\n\n';
      wholesale.forEach(p => {
        text += `${idx++}. ${canonicalProductName(p)}`;
        if (p.code) text += ` (کد: ${sanitizeText(String(p.code))})`;
        text += '\n';
      });
    }
  }

  // ── فقط یک لینک در انتها ──
  text += '\n';
  if (isWholesaleCustomer || hasWholesaleProduct) {
    text += `💰 برای اطلاع از قیمت‌ها و ثبت سفارش عمده:\n${PORTAL_URL}`;
  } else {
    text += `🛍️ خرید از فروشگاه آنلاین عقرب:\n🌐 ${RETAIL_URL}`;
  }

  return text;
}

// ═══════════════════════════════════════════════════════════════════════════
// ۴. هندلر اصلی
// ═══════════════════════════════════════════════════════════════════════════
function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += String(chunk); });
    req.on('end', () => resolve(body));
    req.on('error', () => resolve(''));
  });
}

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method === 'GET') {
    // VERSION endpoint for deployment verification
    return res.status(200).json({
      version: VERSION,
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── Body Parsing ─────────────────────────────────────────────
    const rawBody = await readBody(req);
    let payload;
    try { payload = rawBody ? JSON.parse(rawBody) : {}; }
    catch (_) { try { payload = req.body || {}; } catch { payload = {}; } }

    const data = payload?.data || payload;
    const senderPhone = data?.from;
    const messageBody = data?.body;

    if (!senderPhone || !messageBody) {
      return res.status(200).json({ ok: false, message: 'Missing from/body' });
    }

    // ── Interactive Button / List Reply Detection ─────────────────
    // UltraMsg sends button_reply/list_reply with messageBody still set;
    // we detect the interactive type via the nested object and extract node_key.
    let interactiveNodeKey = null;
    if (data?.button?.id) {
      interactiveNodeKey = data.button.id;
      console.log(`[Interactive] Button reply: id="${data.button.id}" text="${data.button.text}" from ${senderPhone}`);
    } else if (data?.listReply?.id) {
      interactiveNodeKey = data.listReply.id;
      console.log(`[Interactive] List reply: id="${data.listReply.id}" title="${data.listReply.title}" from ${senderPhone}`);
    }

    // ── Phone Formatting ─────────────────────────────────────────
    const rawDigits = senderPhone.replace('@c.us', '').replace(/\D/g, '');
    const cleanPhone = formatPhone(rawDigits);
    const internationalPhone = formatPhoneInternational(rawDigits);

    // ── Normalized Message (channel-agnostic contract) ───────────
    const nm = normalizeMessage('whatsapp', senderPhone, messageBody);
    const normalizedKey = nm.normalized_user_key;

    // ── ۱. ذخیره پیام در دیتابیس ─────────────────────────────────
    const { data: inserted, error: insertErr } = await supabase
      .from('whatsapp_inbox')
      .insert({ sender_phone: cleanPhone, message_body: messageBody, raw_payload: payload, source_channel: nm.channel })
      .select()
      .single();

    if (insertErr) {
      console.error('[Webhook] DB insert error:', insertErr);
      return res.status(200).json({ ok: false, message: 'Database error' });
    }
    console.log(`[Webhook] Message stored: ${inserted.id} (whatsapp_inbox)`);

    // ── ۱b. Omnichannel: Find/Create Conversation + Insert Message ──────
    // Dual-write به ساختار جدید omnichannel. خطا breakکننده نیست.
    try {
      let { data: conversation, error: convErr } = await supabase
        .from('conversations')
        .select('id, status')
        .eq('channel', nm.channel)
        .eq('external_chat_id', cleanPhone)
        .maybeSingle();
      if (convErr) throw convErr;
      if (!conversation) {
        const { data: newConv, error: createErr } = await supabase
          .from('conversations')
          .insert({
            channel: nm.channel,
            external_chat_id: cleanPhone,
            status: 'open',
            last_message_at: new Date().toISOString(),
          })
          .select('id, status')
          .single();
        if (createErr) throw createErr;
        conversation = newConv;
      }
      const { error: msgErr } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversation.id,
          is_inbound: true,
          channel: nm.channel,
          message_body: messageBody,
          external_message_id: data?.id || null,
          metadata: {
            raw_data: data,
            push_name: data?.pushname || null,
            from_webhook: true,
          },
        });
      if (msgErr) throw msgErr;
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', conversation.id);

      // ── ۱c. Auto-link to crm_customers (non-blocking) ──────────
      autoLinkCustomerToConversation(conversation.id, cleanPhone).catch(() => {});
    } catch (omniErr) {
      console.warn('[Omnichannel] Non-critical write error:', omniErr.message);
    }

    // ── ۲. Customer Resolution (Phase 1 — read-only) ──────────────
    const customerInfo = USE_PHASE1_ROUTER
      ? await resolveCustomer(normalizedKey)
      : { status: 'unknown', sales_segment: null };
    if (USE_PHASE1_ROUTER) console.log(`[Customer] ${customerInfo.status} for ${cleanPhone}`);

    // ── ۲ab. Segment Hint Detection (Phase 1 — text-based) ──────
    let segmentHint = null;
    if (USE_PHASE1_ROUTER && customerInfo.status === 'unknown') {
      segmentHint = detectSegmentHint(messageBody);
      if (segmentHint) console.log(`[Segment] Hint: ${segmentHint} for ${cleanPhone}`);
    }
    const effectiveStatus = customerInfo.status === 'unknown' && segmentHint
      ? `known_${segmentHint}`
      : customerInfo.status;

    // ── ۲a. Escalation Context (Phase 2) ─────────────────────────
    let activeEscalation = null;
    let escalationContext = {};
    if (USE_PHASE2_CONTEXT) {
      activeEscalation = await findActiveEscalation(cleanPhone);
      if (activeEscalation) {
        escalationContext = extractEscalationContext(messageBody);
        console.log(`[Escalation] Active for ${cleanPhone}, intent=${activeEscalation.auto_reply_type}, msg_id=${activeEscalation.id}`);
      }
    }

    // ── ۲b. Menu State Detection ─────────────────────────────────
    const isFirstTimeCustomer = await checkIsFirstTimeCustomer(cleanPhone);
    const menuContext = isFirstTimeCustomer ? null : await findRecentMenuContext(cleanPhone);

    // ── ۲b2. Dynamic Menu Session State ──────────────────────────
    const dynamicMenuSession = await menuEngine.getSessionState(cleanPhone);
    const hasDynamicMenuContext = !!dynamicMenuSession?.current_node_id;
    if (hasDynamicMenuContext) {
      console.log(`[Menu] Dynamic session active for ${cleanPhone}, node=${dynamicMenuSession.current_node_id}`);
    }

    // ── ۳. از سیستم نباشه ───────────────────────────────────────
    let replySent = false;
    let replyType = null;
    let needsHuman = false;

    if (isFromSystem(payload)) {
      console.log('[Webhook] Skipping — fromMe=true');
    } else if (USE_SIMPLIFIED_FLOW) {
      // ═══════════════════════════════════════════════════════════════
      // Simplified Portal Flow — WhatsApp as Acquisition Channel Only
      // ═══════════════════════════════════════════════════════════════
      const simpleResult = detectSimpleIntent(messageBody || '');
      let replyText = '';

      if (simpleResult.intent === 'GREETING') {
        replyText = WELCOME_SIMPLE;
        replyType = 'welcome_simple';
      } else if (simpleResult.intent === 'RETAIL_CHOICE') {
        replyText = RETAIL_REPLY;
        replyType = 'retail_choice';
      } else if (simpleResult.intent === 'WHOLESALE_CHOICE') {
        replyText = WHOLESALE_REPLY;
        replyType = 'wholesale_choice';
      } else {
        replyText = FALLBACK_SIMPLE;
        replyType = 'fallback_simple';
      }

      console.log(`[SimpleFlow] ${simpleResult.intent} → ${replyType} for ${cleanPhone}`);

      // ── Send via UltraMsg ─────────────────────────────────────────
      const cooldownActive = COOLDOWN_MINUTES > 0 ? await isCooldownActive(cleanPhone) : false;
      if (replyText && !cooldownActive) {
        try {
          const result = await sendWhatsAppMessage(internationalPhone, replyText);
          replySent = result.sent;
          if (result.sent) {
            console.log(`[SimpleFlow] Sent ✓ for ${cleanPhone}`);
          } else {
            console.warn(`[SimpleFlow] Send failed: ${result.error}`);
          }
        } catch (sendErr) {
          console.error(`[SimpleFlow] Send error: ${sendErr.message}`);
        }
      }

      // ── Update whatsapp_inbox ─────────────────────────────────────
      if (inserted?.id) {
        const updateFields = {};
        if (replySent && replyType) {
          updateFields.auto_replied = true;
          updateFields.auto_reply_type = replyType;
          updateFields.auto_reply_at = new Date().toISOString();
        }
        if (USE_PHASE1_ROUTER) {
          updateFields.source_channel = nm.channel;
        }
        try {
          await supabase.from('whatsapp_inbox').update(updateFields).eq('id', inserted.id);
        } catch (dbErr) {
          console.warn('[SimpleFlow] DB update error:', dbErr.message);
        }
      }

      // ── Omnichannel reply sync ───────────────────────────────────
      try {
        if (replySent && replyType) {
          const { data: omniConv } = await supabase
            .from('conversations').select('id')
            .eq('channel', 'whatsapp').eq('external_chat_id', cleanPhone)
            .maybeSingle();
          if (omniConv) {
            await supabase.from('conversation_messages').insert({
              conversation_id: omniConv.id, is_inbound: false, channel: 'whatsapp',
              message_type: replyType, message_body: replyText,
              metadata: { reply_to_whatsapp_inbox_id: inserted?.id, reply_type: replyType, from_webhook: true },
            });
            await supabase.from('conversations').update({
              last_message_at: new Date().toISOString(), updated_at: new Date().toISOString()
            }).eq('id', omniConv.id);
          }
        }
      } catch (omniErr) {
        console.warn('[SimpleFlow] Omni sync error:', omniErr.message);
      }

    } else {
      // ── ۳. Intent Detection ──────────────────────────────────────
      let intent;
      let intentSubtype = 'GENERAL';
      const text = (messageBody || '').trim();
      const normalizedDigits = normalizePersianDigits(text);
      const isMenuTrigger = /^(منو|menu)$/i.test(normalizeText(text));
      const isMenuDigitPattern = /^[0-9]{1,2}$/.test(normalizedDigits);

      let dynamicSelectedNode = null;
      let replyText = null;

      // ── اولویت اول: Interactive Button / List Reply → Direct Menu ──
      if (interactiveNodeKey) {
        const node = await menuEngine.getNodeByKey(interactiveNodeKey);
        if (node) {
          if (node.action_type === 'SUBMENU' && node.has_children) {
            await menuEngine.setSessionState(cleanPhone, node.id);
            const children = await menuEngine.getChildren(node.id, effectiveStatus);
            replyText = menuEngine.renderNumericMenu(children, node);
            replyType = 'menu';
            intent = '__DYNAMIC_MENU_HANDLED';
          } else {
            await menuEngine.setSessionState(cleanPhone, null);
            const nodeResp = menuEngine.buildNodeResponse(node);
            replyText = nodeResp.message;
            replyType = nodeResp.action_type.toLowerCase();
            needsHuman = (nodeResp.action_type === 'HUMAN_SUPPORT');
            intent = '__DYNAMIC_MENU_HANDLED';
          }
          console.log(`[Interactive] Node "${node.node_key}" (${node.title}) activated for ${cleanPhone}`);
        } else {
          intent = 'FALLBACK';
          console.log(`[Interactive] Node key "${interactiveNodeKey}" not found for ${cleanPhone}`);
        }
      } else if (isFirstTimeCustomer) {
        intent = 'WELCOME_FIRST';
        console.log(`[Menu] First-time customer ${cleanPhone} — sending WELCOME_FIRST`);
      } else if (isMenuTrigger) {
        intent = 'MENU_ROOT';
        console.log(`[Menu] Trigger word matched for ${cleanPhone}`);
      } else if (isMenuDigitPattern && hasDynamicMenuContext) {
        // ── Catalog Override: digit 3 → MENU_CATALOG ──────────────
        if (MENU_DIGIT_MAP[normalizedDigits] === 'MENU_CATALOG') {
          intent = 'MENU_CATALOG';
          await menuEngine.setSessionState(cleanPhone, null);
          console.log(`[Catalog] Digit ${normalizedDigits} → MENU_CATALOG (override dynamic menu)`);
        } else {
          // ── Dynamic Menu Navigation (catalog-excluded digits only) ──
          const children = await menuEngine.getChildren(
            dynamicMenuSession.current_node_id,
            effectiveStatus
          );
          const digitIndex = parseInt(normalizedDigits, 10);

          if (digitIndex === 0) {
            intent = 'MENU_ROOT';
          } else if (digitIndex >= 1 && digitIndex <= children.length) {
            const sel = children[digitIndex - 1];
            dynamicSelectedNode = sel;

            if (sel.action_type === 'SUBMENU' && sel.has_children) {
              // Navigate deeper into subtree
              await menuEngine.setSessionState(cleanPhone, sel.id);
              const subChildren = await menuEngine.getChildren(sel.id, effectiveStatus);
              replyText = menuEngine.renderNumericMenu(subChildren, sel);
              replyType = 'menu';
              intent = '__DYNAMIC_MENU_HANDLED';
            } else {
              // Leaf action (URL, HUMAN_SUPPORT, WARRANTY, etc.)
              await menuEngine.setSessionState(cleanPhone, null);
              const nodeResp = menuEngine.buildNodeResponse(sel);
              replyText = nodeResp.message;
              replyType = nodeResp.action_type.toLowerCase();
              needsHuman = (nodeResp.action_type === 'HUMAN_SUPPORT');
              intent = '__DYNAMIC_MENU_HANDLED';
            }
            console.log(`[Menu] Dynamic digit "${normalizedDigits}" → ${sel.title} (${sel.action_type}) for ${cleanPhone}`);
          } else {
            intent = 'FALLBACK';
          }
        }
      } else if (isMenuDigitPattern && MENU_DIGIT_MAP[normalizedDigits]) {
        // ── Direct digit routing — بدون نیاز به menu context ──
        intent = MENU_DIGIT_MAP[normalizedDigits];
        console.log(`[Menu] Direct digit "${normalizedDigits}" → ${intent} (no menu context)`);
      } else if (/^سلام$/iu.test(text)) {
        intent = 'GREETING';
        console.log('[Intent Override] Forced GREETING for سلام');
        console.log('[IntentOverride] GREETING confirmed');
      } else {
        console.log('[Intent-Debug] detectIntent input:', JSON.stringify(messageBody));
        const intentResult = detectIntent(messageBody);
        console.log('[Intent-Debug] detectIntent result:', JSON.stringify(intentResult));
        intent = intentResult.intent;
        intentSubtype = intentResult.subtype || 'GENERAL';
      }

      // Phase 1: demote new intents when the flag is off (D-1 fix)
      if (!USE_PHASE1_ROUTER && ['DISSATISFACTION', 'REFUND_REQUEST', 'WARRANTY_QUERY'].includes(intent)) {
        intent = 'FALLBACK';
      }

      // ─── Phase 2: Escalation Context (Override) ───────────────────────────────
      // Self-service intents that should NOT be escalated
      const SELF_SERVICE_INTENTS = [
        'PRODUCT_QUERY',
        'PRICE_QUERY',
        'ORDER',
        'GREETING',
        'HELP',
        'BRAND_QUESTION',
        'WARRANTY_QUERY',
        'GENERAL',
      ];
      if (USE_PHASE2_CONTEXT && activeEscalation) {

        // Preserve MENU_* intents — they have their own handling path
        if (intent.startsWith('MENU_') || intent === '__DYNAMIC_MENU_HANDLED') {
          console.log(`[Phase2] Preserving menu intent "${intent}" in active escalation`);

        } else {
          // Re-detect intent for self-service check (defense in depth)
          const reDetectedResult = detectIntent(messageBody);
          const reIntentName = reDetectedResult.intent;

          if (SELF_SERVICE_INTENTS.includes(reIntentName)) {
            // Self-service message → serve directly, do NOT escalate
            console.log(`[Phase2] Self-service intent "${reIntentName}" in active escalation → serving directly, not escalating`);
            intent = reIntentName;
            intentSubtype = reDetectedResult.subtype || 'GENERAL';
          } else {
            // Genuine escalation follow-up → capture rich context
            intent = 'ESCALATION_FOLLOWUP';
            needsHuman = true;
            escalationContext = {
              previous_escalation_id: activeEscalation.id,
              escalation_intent: activeEscalation.auto_reply_type || 'unknown',
              original_message: activeEscalation.message_body?.substring(0, 200),
              followup_message: messageBody.substring(0, 200),
              time_since_escalation: `${Math.floor((Date.now() - new Date(activeEscalation.created_at)) / 60000)} minutes`,
            };
            console.log('[Phase2] ESCALATION_FOLLOWUP detected:', escalationContext);
          }
        }
      }

      // ── Clear dynamic session on non-menu intents ──────────────────
      // اگر کاربر در منوی دینامیک بود و متنی (نه عدد) فرستاد که به منو مربوط نیست،
      // سشن را پاک می‌کنیم تا ارقام بعدی به‌عنوان انتخاب منو تفسیر نشوند.
      if (hasDynamicMenuContext &&
          intent !== '__DYNAMIC_MENU_HANDLED' &&
          intent !== 'MENU_ROOT' &&
          intent !== 'FALLBACK' &&
          !intent.startsWith('MENU_')) {
        await menuEngine.setSessionState(cleanPhone, null);
        console.log(`[Menu] Cleared dynamic session for ${cleanPhone} — non-menu intent "${intent}"`);
      }

      console.log(`[Intent] ${intent} from ${cleanPhone}`);

      // ── Wholesale Price Protection Guard ──────────────────────────
      // قبل از هرگونه پردازش AI، اگر کاربر درباره قیمت عمده سوال کرده باشد،
      // مستقیماً به پرتال عمده‌فروشی هدایت می‌شود.
      if (hasWholesalePriceQuery(text) &&
          intent !== '__DYNAMIC_MENU_HANDLED' &&
          intent !== 'MENU_ROOT' &&
          !intent.startsWith('MENU_')) {
        replyText = WHOLESALE_PORTAL_REPLY;
        replyType = 'wholesale_redirect';
        intent = '__WHOLESALE_GUARD';
        console.log(`[WholesaleGuard] Intercepted wholesale query from ${cleanPhone}: "${messageBody}"`);
      }

      // ── ۳a. CATALOG — پاسخ کاتالوگ (getAutoReply + fallback) ────
      if (intent === 'MENU_CATALOG') {
        replyType = 'menu_catalog';
        let catalogReply = null;
        try {
          catalogReply = getAutoReply('MENU_CATALOG');
        } catch (e) {
          console.log('[Catalog] Error calling getAutoReply for MENU_CATALOG:', e.message);
        }
        if (!catalogReply || catalogReply === NEUTRAL_REPLY) {
          console.log('[Catalog-Fallback] Using fallback catalog message.');
          replyText = `📖 *کاتالوگ محصولات اسکورپیون*\n\n` +
                      `برای مشاهده لیست محصولات و دسته‌بندی‌ها می‌توانید از پورتال‌های رسمی ما استفاده کنید:\n\n` +
                      `🛒 بخش خرده فروشی:\n` +
                      `https://scorpiongroup.ir\n\n` +
                      `🏢 بخش عمده فروشی:\n` +
                      `https://wholesale-portal-azure.vercel.app\n\n` +
                      `📍 جهت بازگشت به منوی اصلی عدد 0 را ارسال کنید.`;
        } else {
          replyText = catalogReply;
        }
      }
      // ── ۳b. ESCALATION — AI پاسخ اولیه بده + نیاز انسان ─────────
      else if (intent === 'ESCALATION') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('ESCALATION');
        replyType = ai.replyType || 'escalation';
        needsHuman = true;
      }

      // ── ۳aa. DISSATISFACTION — AI با empathy + ارجاع به پشتیبانی
      else if (intent === 'DISSATISFACTION') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('DISSATISFACTION');
        replyType = ai.replyType || 'dissatisfaction';
        needsHuman = true;
        // ثبت درخواست در گارانتی برای پیگیری
        saveWarrantyReturn({
          customer_phone: cleanPhone,
          customer_name: '',
          reason: 'نارضایتی مشتری — نیاز به پیگیری',
        }).catch(err => console.error('[Webhook] خطا در ثبت گارانتی:', err?.message));
      }

      // ── ۳ab. REFUND_REQUEST — AI با empathy + ارجاع به پشتیبانی
      else if (intent === 'REFUND_REQUEST') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('REFUND_REQUEST');
        replyType = ai.replyType || 'refund_request';
        needsHuman = true;
        // ثبت درخواست مرجوعی در دیتابیس
        saveWarrantyReturn({
          customer_phone: cleanPhone,
          customer_name: '',
          reason: 'درخواست مرجوعی وجه',
        }).catch(err => console.error('[Webhook] خطا در ثبت مرجوعی:', err?.message));
      }

      // ── ۳ac. ESCALATION_FOLLOWUP — AI دنباله escalation رو ادامه بده
      else if (intent === 'ESCALATION_FOLLOWUP') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || `پیام شما به درخواست پشتیبانی قبلی اضافه شد. کارشناسان در ساعت اداری بررسی می‌کنند.\n\nپشتیبانی: ${SUPPORT_PHONE}`;
        replyType = ai.replyType || 'escalation_followup';
        needsHuman = true;
      }

      // ── ۳ad. Numbered Menu — WELCOME_FIRST / MENU_ROOT / Dynamic Menu ──
      else if (intent === 'WELCOME_FIRST') {
        replyText = getAutoReply('WELCOME_FIRST');
        replyType = 'welcome_first';
      }
      else if (intent === '__DYNAMIC_MENU_HANDLED') {
        // Already handled in intent detection — no-op
        console.log(`[Menu] Dynamic menu handled for ${cleanPhone}`);
      }
      else if (intent === '__WHOLESALE_GUARD') {
        // Already handled by guard — no-op
        console.log(`[WholesaleGuard] Portal redirect sent to ${cleanPhone}`);
      }
      else if (intent === 'MENU_ROOT') {
        // Load root menu from dynamic tree
        const rootNode = await menuEngine.getRootNode();
        if (rootNode) {
          await menuEngine.setSessionState(cleanPhone, rootNode.id);
          const children = await menuEngine.getChildren(rootNode.id, effectiveStatus);
          replyText = menuEngine.renderNumericMenu(children, rootNode);
          replyType = 'menu';
        } else {
          // Fallback to static if DB fails
          replyText = getAutoReply('MENU');
          replyType = 'menu';
        }
      }
      else if (intent.startsWith('MENU_')) {
        // Legacy static menu intents → try to resolve via dynamic tree
        const legacyMap = {
          'MENU_WHOLESALE': 'wholesale',
          'MENU_RETAIL': 'retail',
          'MENU_TRACKING': 'tracking',
          'MENU_WARRANTY': 'warranty',
          'MENU_PRODUCT_GUIDE': 'product_guide',
          'MENU_PURCHASE_GUIDE': 'purchase_guide',
          'MENU_ESCALATION': 'support'
        };
        const nodeKey = legacyMap[intent];
        if (nodeKey) {
          const node = await menuEngine.getNodeByKey(nodeKey);
          if (node) {
            await menuEngine.setSessionState(cleanPhone, node.id);
            const children = await menuEngine.getChildren(node.id, effectiveStatus);
            if (children.length > 0) {
              replyText = menuEngine.renderNumericMenu(children, node);
            } else {
              const nodeResp = menuEngine.buildNodeResponse(node);
              replyText = nodeResp.message;
              needsHuman = (nodeResp.action_type === 'HUMAN_SUPPORT');
            }
            replyType = 'menu';
          } else {
            // Fallback: use static auto-reply
            replyText = getAutoReply(resolveReplyKey(intent));
            replyType = intent.substring(5).toLowerCase();
            needsHuman = (intent === 'MENU_ESCALATION');
          }
        } else {
          replyText = getAutoReply('FALLBACK');
          replyType = 'fallback';
        }
        console.log(`[Menu] Static intent ${intent} resolved via dynamic tree for ${cleanPhone}`);
      }

      // ── ۳b. AI-FIRST — همه پاسخ‌های غیرمنو از AI عبور می‌کنند ──
      // GREETING / HELP → AI با لحن گرم و طبیعی
      else if (intent === 'GREETING' || intent === 'HELP') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || 'سلام! به فروشگاه محصولات غذایی عقرب خوش آمدید.\nخرید شما عمده است یا خرده؟';
        replyType = ai.replyType || intent.toLowerCase();
      }
      // BRAND_QUESTION → AI
      else if (intent === 'BRAND_QUESTION') {
        const brandAnswer = await searchBrandKnowledge(messageBody);
        if (brandAnswer) {
          replyText = brandAnswer;
          replyType = 'brand_knowledge';
        } else {
          const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
          replyText = ai.reply || getAutoReply('BRAND_QUESTION');
          replyType = ai.replyType || 'brand_fallback';
        }
      }
      // WARRANTY_QUERY → AI (با context گارانتی)
      else if (intent === 'WARRANTY_QUERY') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('WARRANTY_QUERY');
        replyType = ai.replyType || 'static';
      }
      // ORDER → AI با راهنمایی طبیعی
      else if (intent === 'ORDER') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('ORDER');
        replyType = ai.replyType || 'order';
        // ثبت درخواست خرید در دیتابیس
        saveOrderRequest({
          customer_phone: cleanPhone,
          customer_type: effectiveStatus || 'unknown',
          product_interest: messageBody.slice(0, 200),
          message_text: messageBody.slice(0, 500),
        }).catch(err => console.error('[Webhook] خطا در ثبت درخواست خرید:', err?.message));
      }
      // GENERAL → AI (قبلاً هم AI بود)
      else if (intent === 'GENERAL') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('GENERAL');
        replyType = ai.replyType || 'general_fallback';
      }
      // PRICE_QUERY → AI (ممنوعیت قیمت در پرامپت AI کنترل می‌شه)
      else if (intent === 'PRICE_QUERY') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('FALLBACK');
        replyType = ai.replyType || 'price_fallback';
        // ثبت لید (مخصوصاً برای مشتری عمده)
        if (effectiveStatus === 'known_wholesale') {
          saveOrderRequest({
            customer_phone: cleanPhone,
            customer_type: 'wholesale',
            product_interest: 'استعلام قیمت — ' + messageBody.slice(0, 200),
            message_text: messageBody.slice(0, 500),
          }).catch(err => console.error('[Webhook] خطا در ثبت لید قیمت:', err?.message));
        }
      }
      // EDUCATION → AI
      else if (intent === 'EDUCATION') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('EDUCATION');
        replyType = ai.replyType || 'education';
      }
      // CONTACT → AI (اطلاعات تماس توی پرامپته)
      else if (intent === 'CONTACT') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('FALLBACK');
        replyType = ai.replyType || 'contact';
      }
      // FALLBACK → AI (به جای جواب رباتیک، AI سعی می‌کنه بفهمه)
      else if (intent === 'FALLBACK') {
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus);
        replyText = ai.reply || getAutoReply('FALLBACK');
        replyType = ai.replyType || 'fallback';
      }

      // ── ۳h. PRODUCT_QUERY — AI-FIRST: موتور جستجوی محصول + AI ──
      else {
        console.log(`[ProductAI] START | msg="${messageBody}" | customer=${effectiveStatus} | phone=${cleanPhone}`);

        // ── جستجوی محصولات ─────────────────────────────────────────
        const normalizedMsg = messageBody.trim().replace(/\s+/g, ' ');
        const products = await searchProducts(messageBody);
        const signalResult = await detectAndSearchProducts(messageBody);

        // ترکیب نتایج جستجو
        const allProducts = products.length > 0 ? products :
                          signalResult.products || [];

        console.log(`[ProductAI] Found ${allProducts.length} product(s) for ${cleanPhone}`);

        // ── AI با context محصولات ──────────────────────────────────
        const ai = await aiReply(messageBody, cleanPhone, effectiveStatus, {
          products: allProducts.length > 0 ? allProducts : undefined,
        });

        if (ai.reply) {
          replyText = ai.reply;
          replyType = ai.replyType;
          console.log(`[ProductAI] AI response for ${cleanPhone}`);
        } else if (ai.limitReached) {
          replyText = 'در حال حاضر به سقف پاسخگویی هوشمند رسیده‌ایم. لطفاً بعداً تلاش کنید یا با پشتیبانی تماس بگیرید.';
          replyType = 'ai_limit';
        } else if (allProducts.length > 0) {
          // Fallback نهایی: لیست محصولات
          replyText = buildProductReply(allProducts, effectiveStatus);
          replyType = 'product_search';
          console.log(`[ProductAI] Fallback to product list for ${cleanPhone}`);
        } else {
          replyText = getAutoReply('FALLBACK');
          replyType = 'fallback';
          await logSearchMiss(messageBody, cleanPhone);
        }
      }

      // ── ۳y. GREETING Guarantee: AI جواب سلام را با «سلام» شروع کن ──
      if (intent === 'GREETING' && replyText && !/^سلام/ui.test(replyText.trim())) {
        replyText = 'سلام!\n' + replyText;
        console.log(`[Greeting] Prepended Salam for ${cleanPhone}`);
      }

      // ── ۳z. Customer-Type Adjustments (Phase 1 only) ─────────────
      if (replyText && replyType && USE_PHASE1_ROUTER) {
        const isEscalationType = needsHuman || ['ESCALATION', 'DISSATISFACTION', 'REFUND_REQUEST'].includes(intent);
        if (effectiveStatus === 'unknown' && !isEscalationType && ![
          'GREETING', 'HELP', 'GENERAL', 'PRODUCT_QUERY', 'BRAND_QUESTION', 'CONTACT',
          'ORDER', 'PRICE_QUERY', 'FALLBACK',
          'WELCOME_FIRST', 'MENU_ROOT', 'MENU_WHOLESALE', 'MENU_RETAIL', 'MENU_CATALOG',
          'MENU_TRACKING', 'MENU_WARRANTY', 'MENU_PRODUCT_GUIDE', 'MENU_PURCHASE_GUIDE',
        ].includes(intent)) {
          // مسیر خنثی برای مشتریان ناشناس (به‌جز سلام)
          replyText = NEUTRAL_REPLY;
          replyType = 'neutral';
          console.log(`[Customer] Neutral path for unknown ${cleanPhone}`);
        } else if (effectiveStatus === 'known_retail') {
          // حذف لینک پورتال و شماره فروش برای مشتری خرد
          const before = replyText;
          replyText = suppressWholesaleFromReply(replyText);
          if (before !== replyText) {
            console.log(`[Customer] Retail suppression applied for ${cleanPhone}`);
          }
        }
      }

      // ── ۴. Response Model — تبدیل replyText به مدل استاندارد ─────
      //     (Backward Compatible: string → adapter → Response Model → renderer → text)
      if (replyText) {
        const responseModel = ensureResponseModel(replyText);
        replyText = renderWhatsAppText(responseModel);
      }

      // ── ۵. Cooldown + ارسال ─────────────────────────────────────
      if (replyText && replyType) {
        const cooldownActive = COOLDOWN_MINUTES > 0 ? await isCooldownActive(cleanPhone) : false;

        if (cooldownActive) {
          console.log(`[Auto-Reply] Cooldown active for ${cleanPhone} — skipping`);
        } else {
          try {
            const result = await sendWhatsAppMessage(internationalPhone, replyText);
            if (result.sent) {
              replySent = true;
              console.log(`[Auto-Reply] Sent ${replyType} to ${cleanPhone}`);
            } else {
              console.warn(`[Auto-Reply] FAILED for ${cleanPhone}: ${result.error}`);
            }
          } catch (sendErr) {
            console.error(`[Auto-Reply] Error sending to ${cleanPhone}:`, sendErr.message);
          }
        }
      }
    }

    // ── ۶. ثبت پاسخ خودکار در دیتابیس ─────────────────────────────
    if (inserted?.id) {
      const updateFields = {};
      if (replySent && replyType) {
        updateFields.auto_replied = true;
        updateFields.auto_reply_type = replyType;
        updateFields.auto_reply_at = new Date().toISOString();
      }
      // ثبت منبع پیام (channel-agnostic logging — Phase 1)
      if (USE_PHASE1_ROUTER && !updateFields.source_channel) {
        updateFields.source_channel = nm.channel;
      }
      if (needsHuman) {
        updateFields.needs_human = true;

        // Phase 2: escalation metadata on the initiating message
        if (USE_PHASE2_CONTEXT && !activeEscalation) {
          try {
            const { data: cur } = await supabase
              .from('whatsapp_inbox')
              .select('raw_payload')
              .eq('id', inserted.id)
              .single();
            if (cur?.raw_payload) {
              const rp = typeof cur.raw_payload === 'string' ? JSON.parse(cur.raw_payload) : cur.raw_payload;
              rp.escalation_meta = {
                escalated_at: new Date().toISOString(),
                escalation_intent: intent,
                original_message: messageBody,
              };
              updateFields.raw_payload = rp;
            }
          } catch (e) {
            console.warn('[Escalation] Meta save error:', e.message);
          }
        }
      }

      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await supabase
          .from('whatsapp_inbox')
          .update(updateFields)
          .eq('id', inserted.id);
        if (updateError) console.error('[DB] Update error:', updateError.message);
      }

      // ── ۶b. Omnichannel: Sync reply message + conversation status ─────
      // درج پیام خروجی (پاسخ خودکار) در جدول messages + به‌روزرسانی وضعیت گفتگو
      try {
        if (replySent && replyType) {
          const { data: omniConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('channel', 'whatsapp')
            .eq('external_chat_id', cleanPhone)
            .maybeSingle();
          if (omniConv) {
            await supabase.from('conversation_messages').insert({
              conversation_id: omniConv.id,
              is_inbound: false,
              channel: 'whatsapp',
              message_type: replyType,
              message_body: replyText,
              metadata: {
                reply_to_whatsapp_inbox_id: inserted?.id,
                reply_type: replyType,
                from_webhook: true,
              },
            });
            const convUpdate = {
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            if (needsHuman) convUpdate.status = 'escalated';
            await supabase.from('conversations').update(convUpdate).eq('id', omniConv.id);
          }
        }
      } catch (omniReplyErr) {
        console.warn('[Omnichannel] Reply sync error:', omniReplyErr.message);
      }

      // Phase 2: save escalation context to the original escalation record
      if (USE_PHASE2_CONTEXT && activeEscalation && Object.keys(escalationContext).length > 0) {
        try {
          const { data: orig } = await supabase
            .from('whatsapp_inbox')
            .select('raw_payload')
            .eq('id', activeEscalation.id)
            .single();
          if (orig?.raw_payload) {
            const rp = typeof orig.raw_payload === 'string' ? JSON.parse(orig.raw_payload) : orig.raw_payload;
            if (!rp.escalation_context) rp.escalation_context = {};
            for (const [k, v] of Object.entries(escalationContext)) {
              if (v && !rp.escalation_context[k]) rp.escalation_context[k] = v;
            }
            await supabase
              .from('whatsapp_inbox')
              .update({ raw_payload: rp })
              .eq('id', activeEscalation.id);
            console.log(`[Escalation] Context saved for msg ${activeEscalation.id}:`, escalationContext);
          }
        } catch (e) {
          console.warn('[Escalation] Context persist error:', e.message);
        }
      }
    }

    // ── ۷. Auto Lead Creation ─────────────────────────────────────
    try {
      const { data: existingLead } = await supabase
        .from('leads').select('id').eq('mobile', cleanPhone).maybeSingle();

      if (existingLead) {
        await supabase.from('leads').update({
          last_message: messageBody,
          last_message_at: new Date().toISOString(),
        }).eq('id', existingLead.id);
      } else {
        await supabase.from('leads').insert({
          mobile: cleanPhone, source: 'whatsapp', status: 'new',
          last_message: messageBody, last_message_at: new Date().toISOString(),
        });
      }
    } catch (leadErr) {
      console.warn('[Leads] Skipped:', leadErr.message);
    }

    return res.status(200).json({ ok: true, message_id: inserted?.id });

  } catch (err) {
    console.error('[Webhook] Unexpected error:', err);
    return res.status(200).json({ ok: false, message: 'Internal error' });
  }
};
