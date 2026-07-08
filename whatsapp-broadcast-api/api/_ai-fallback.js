/**
 * Scorpion Sales AI v6.0 — Consultative Sales Agent
 * =========================
 * فراخوانی GapGPT API برای پاسخگویی هوشمند
 * زمانی که جستجوی دیتابیس نتیجه‌ای نداشت
 *
 * قابلیت‌ها:
 *   - ارسال context شامل کاتالوگ محصولات فعال
 *   - شمارنده مصرف روزانه/ماهانه برای کنترل هزینه
 *   - قابلیت قطع خودکار در صورت رسیدن به سقف
 */

'use strict';

const { supabase } = require('./_lib');

// ─── تنظیمات ─────────────────────────────────────────────────────────────
const AI_API_URL = 'https://api.gapgpt.app/v1/chat/completions';
const AI_MODEL = 'gpt-4o-mini';
const DAILY_TOKEN_LIMIT = 50000;    // سقف روزانه توکن (قابل تنظیم)
const MONTHLY_TOKEN_LIMIT = 500000; // سقف ماهانه توکن

async function buildSystemPrompt(supabaseClient) {
  const catalog = `
## کاتالوگ محصولات:

### چای‌های فله (کارتن ۱۰ کیلویی):
- چای سیاه شکسته زرین | کد: ۵۵۵
- چای سیاه شکسته زرین فوق ممتاز | کد: ۶۶۶  
- چای سیاه نیم ریز زرین | کد: ۷۷۷
- چای سیاه باروتی زرین | کد: ۸۸۸

### چای‌های ۵۰۰ گرمی (جعبه متالایز):
- چای سیاه شکسته رزین ۵۰۰ گرم
- چای سیاه شکسته معطر ۵۰۰ گرم
- چای سیاه باروتی زرین ۵۰۰ گرم

### چای قوطی فلزی (۴۵۰ گرمی):
- چای سیاه شکسته زرین مجلسی | بسته‌بندی: قوطی فلزی

### چای‌های ۱۰۰ گرمی (جعبه متالایز):
- چای سیاه شکسته رزین ۱۰۰ گرم
- چای سیاه شکسته زرین ۱۰۰ گرم

### چای کیسه‌ای:
- چای سیاه کیسه‌ای | تعداد: ۲۵ عدد | بسته‌بندی: جعبه مقوایی

### بسته هدیه:
- چای سیاه شکسته زرین فوق ممتاز | کد: ۶۶۶ | وزن: ۹۰۰ گرم

### کارتن ۵ کیلویی:
- چای سیاه باروتی رزین | وزن: ۵ کیلوگرم | بسته‌بندی: کارتن

**نکته مهم:** زرین یک نوع چای با کیفیت است که با چای سیاه مخلوط می‌شود، برند مستقل نیست.
`;

  return `شما «عقرب» هستید — دستیار هوشمند فروش و پشتیبانی شرکت آذرمهر صنعت.

## هویت شما 👤
- شما یک کارشناس فروش واقعی و خوش‌برخورد هستید، نه یک ربات
- لحنتان گرم، صمیمی و حرفه‌ای است مثل یک همکار باتجربه
- فارسی روان و خوش‌آواز حرف می‌زنید
- از مشتری استقبال می‌کنید، نه اینکه دستور بدید

## درباره شرکت 🏢
- نام: آذرمهر صنعت
- برند: عقرب (Scorpion) — تخصص ما چای باکیفیت است
- وبسایت خرده‌فروشی: www.scorpiongroup.ir
- پورتال عمده‌فروشی: https://wholesale-portal-azure.vercel.app
- اینستاگرام: @scorpiongrups
- پشتیبانی واتساپ: 09385555686
- تلفن دفتر: 02155636364
- آدرس: تهران، خیابان پانزده خرداد غربی، پلاک ۶۸۹، واحد ۳۰۵
${catalog}

## قوانین طلایی پاسخگویی 🥇

### ۱. شخصیت و لحن
- مثل یک فروشنده واقعی صحبت کن: گرم، مشتاق، کمک‌کننده
- از ایموجی‌های مناسب و به‌جا استفاده کن (🙏 😊 👍 ✅)
- جملاتت کوتاه و روان باشه — ۲-۳ خط برای شروع مکالمه کافیه
- اول سلام کن، بعد بپرس چطور می‌تونی کمک کنی
- اسم برند رو جوری بگو که مشتری حس کنه با یه شرکت معتبر طرفه

### ۲. قیمت‌ها — خط قرمز مطلق ❌
- **به هیچ عنوان قیمت اعلام نکن** — نه به ریال، نه به تومان
- مشتری عمده → بگو: "برای مشاهده قیمت‌های عمده به پورتال ما مراجعه بفرمایید"
- مشتری خرده → بگو: "برای اطلاع از قیمت‌ها به وبسایت فروشگاه مراجعه کنید"
- اگر اصرار کرد → بگو: "کارشناسان فروش پس از بررسی با شما تماس می‌گیرند"

### ۳. مسیر مشتریان 🔀
- مشتری ناشناس → اول خوشامد بگو، بپرس چه کمکی می‌تونی بکنی، محصولات رو معرفی کن
- مشتری خرده → راهنمایی به فروشگاه آنلاین عقرب (scorpiongroup.ir)
- مشتری عمده → راهنمایی به پورتال عمده‌فروشی و توضیح فرایند همکاری

### ۴. گارانتی و بازگشت وجه 🔄
- محصولات عقرب دارای **ضمانت بازگشت وجه** هستند
- اگر مشتری مشکل دارد → با empathy برخورد کن، عذرخواهی کن
- اطلاعات زیر رو بگیر و به پشتیبانی ارجاع بده:
  - کد محصول
  - شماره سفارش (اگر دارد)
  - شرح مشکل
- بگو کارشناسان پشتیبانی (09385555686)很快 پیگیری می‌کنند

### ۵. ثبت سفارش 📝
- اولویت با هدایت به سامانه آنلاینه
- اگر مشتری اصرار داشت سفارش دستی بده → بپذیر و بگو کارشناسان بررسی می‌کنند

### ۶. اطلاعات محصول 📋
- نام محصول، کد، بسته‌بندی، وزن رو دقیق بگو
- درباره انواع چای (شکسته، باروتی، نیم‌ریز، کیسه‌ای) توضیح بده
- اگه مشتری سردرگمه → راهنمایی کن کدوم محصول更适合ش هست

### ۷. سوالات خارج از حوضه
- قهوه، برنج و ... → بگو به‌زودی اضافه می‌شه
- محصولات نامرتبط → بگو متخصص چای هستیم

### ۸. شکایت و نارضایتی 😔
- اول عذرخواهی صمیمانه کن
- بگو درخواست به کارشناسان ارسال می‌شه
- شماره پشتیبانی رو بده: 09385555686

### ۹. اگه چیزی رو نمی‌دونی
- صریح بگو: "برای پاسخ دقیق‌تر با پشتیبانی تماس بگیرید"

### ۱۰. ممنوعیت‌ها ⛔
- هرگز قیمت اعلام نکن
- هرگز اطلاعات نادرست نده
- هرگز بی�ادب یا رباتیک نباش
- هرگز وعده بی‌مورد نده`;
}

/**
 * بررسی سقف مصرف روزانه/ماهانه
 * @returns {Promise<{allowed: boolean, usage_today: number, usage_month: number}>}
 */
async function checkUsageLimit() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: todayCount, error: errToday } = await supabase
      .from('whatsapp_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .eq('status', 'success');

    const { count: monthCount, error: errMonth } = await supabase
      .from('whatsapp_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart)
      .eq('status', 'success');

    if (errToday || errMonth) {
      // جدول ممکن است وجود نداشته باشد
      return { allowed: true, usage_today: 0, usage_month: 0, error: 'Log table not available' };
    }

    const today = todayCount || 0;
    const month = monthCount || 0;

    // تخمین مصرف توکن (هر درخواست حدود ۵۰۰ توکن)
    const todayTokens = today * 500;
    const monthTokens = month * 500;

    if (todayTokens >= DAILY_TOKEN_LIMIT) {
      return { allowed: false, usage_today: today, usage_month: month, reason: 'daily_limit' };
    }
    if (monthTokens >= MONTHLY_TOKEN_LIMIT) {
      return { allowed: false, usage_today: today, usage_month: month, reason: 'monthly_limit' };
    }

    return { allowed: true, usage_today: today, usage_month: month };
  } catch (err) {
    console.error('[AI] Usage limit check error:', err.message);
    return { allowed: true, usage_today: 0, usage_month: 0 };
  }
}

/**
 * دریافت پاسخ از GapGPT API
 * @param {string} userMessage - متن پیام کاربر
 * @param {object} context - context اضافی (مثلاً محصولات یافت‌شده)
 * @returns {Promise<{reply: string|null, usage: number|null}>}
 */
async function askAI(userMessage, context = {}) {
  const apiKey = process.env.GAPGPT_API_KEY;
  if (!apiKey) {
    console.warn('[AI] GAPGPT_API_KEY not set — skipping AI');
    return { reply: null, usage: null };
  }

  // بررسی سقف مصرف
  const limit = await checkUsageLimit();
  if (!limit.allowed) {
    console.warn(`[AI] Usage limit reached: ${limit.reason}`);
    return { reply: null, usage: null, limit_reached: true };
  }

  // ساخت سیستم‌پرامپت (نسخه static فروش مشاوره‌ای)
  const systemPrompt = buildSystemPrompt();

  // ساخت messages
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // اگر context محصول وجود داشت، اضافه کن (فقط اطلاعات غیرقیمتی)
  if (context.products && context.products.length > 0) {
    const productInfo = context.products.map(p => {
      const parts = [`- ${p.name}`];
      if (p.code) parts.push(`کد: ${p.code}`);
      if (p.packaging) parts.push(`بسته‌بندی: ${p.packaging}`);
      if (p.package_size) parts.push(`وزن: ${p.package_size}`);
      parts.push(p.stock > 0 ? 'موجودی: موجود' : 'موجودی: ناموجود');
      return parts.join(' | ');
    }).join('\n');
    messages.push({
      role: 'system',
      content: `اطلاعات محصولات مرتبط با سوال کاربر:\n${productInfo}`
    });
  }

  // اضافه کردن context مکالمه (اگر موجود باشد)
  if (context.conversation_history && context.conversation_history.length > 0) {
    for (const msg of context.conversation_history.slice(-3)) {
      messages.push({ role: msg.role || 'user', content: msg.content });
    }
  }

  // پیام کاربر
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[AI] GapGPT API error ${response.status}:`, errorBody.substring(0, 200));
      return { reply: null, usage: null };
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    const usage = data?.usage?.total_tokens || null;

    if (!reply) {
      console.warn('[AI] Empty response from GapGPT');
      return { reply: null, usage: null };
    }

    // ── Sanitize: حذف کاراکترهای مشکل‌ساز برای UltraMsg/WhatsApp ──
    const sanitized = sanitizeForWhatsApp(reply);

    console.log(`[AI] GapGPT replied (${usage || '?'} tokens): ${sanitized.substring(0, 80)}...`);
    return { reply: sanitized, usage };

  } catch (err) {
    console.error('[AI] Error calling GapGPT:', err.message);
    return { reply: null, usage: null };
  }
}

/**
 * جستجوی brand_knowledge در دیتابیس
 * @param {string} question - متن سوال کاربر
 * @returns {Promise<string|null>} پاسخ از brand_knowledge یا null
 */
async function searchBrandKnowledge(question) {
  if (!question) return null;

  try {
    const { data, error } = await supabase
      .from('brand_knowledge')
      .select('question_pattern, answer')
      .eq('active', true);

    if (error || !data || data.length === 0) return null;

    // نرمال‌سازی سوال
    const normalized = question
      .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\u200C/g, ' ')
      .trim()
      .toLowerCase();

    // جستجوی تطبیقی دوطرفه
    for (const entry of data) {
      const pattern = entry.question_pattern.toLowerCase();
      if (normalized.includes(pattern) || pattern.includes(normalized)) {
        return entry.answer;
      }
    }

    return null;
  } catch (err) {
    console.error('[BrandKnowledge] Error:', err.message);
    return null;
  }
}

/**
 * ثبت جستجوی ناموفق در search_misses
 */
async function logSearchMiss(searchText, senderPhone = '') {
  try {
    await supabase.from('search_misses').insert({
      search_text: searchText.substring(0, 200),
      sender_phone: senderPhone,
      matched_anything: false,
    });
  } catch (err) {
    // جدول search_misses ممکن است وجود نداشته باشد
    console.warn('[SearchMisses] Log error:', err.message);
  }
}

/**
 * پاکسازی متن برای ارسال در WhatsApp
 * - حذف نیم‌فاصله (ZWNJ) ← تبدیل به فاصله معمولی
 * - حذف کاراکترهای کنترلی نامرئی
 * - نرمال‌سازی یونیکد
 */
function sanitizeForWhatsApp(text) {
  if (!text) return '';
  let s = String(text);
  // نیم‌فاصله (ZWNJ U+200C) ← فاصله معمولی
  s = s.replace(/\u200C/g, ' ');
  // حذف کاراکترهای کنترلی (به جز newline و tab)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // حذف RTL/LTR marks
  s = s.replace(/[\u200E\u200F\u202A-\u202E]/g, '');
  // نرمال‌سازی: ضمایر متصل با فاصله (مثلاً "میخوام" به جای "می‌خوام")
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

module.exports = {
  askAI,
  searchBrandKnowledge,
  logSearchMiss,
  checkUsageLimit,
  buildSystemPrompt,
  sanitizeForWhatsApp,
};
