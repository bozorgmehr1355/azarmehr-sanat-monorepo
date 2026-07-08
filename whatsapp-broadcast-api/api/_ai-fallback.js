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
  const retailCatalog = `
### بسته‌بندی‌های مناسب فروشگاه شما:
- **۵۰۰ گرمی (جعبه متالایز):** چای شکسته رزین، چای شکسته معطر، چای باروتی زرین
- **قوطی فلزی مجلسی (۴۵۰ گرم):** چای شکسته زرین مجلسی
- **۱۰۰ گرمی (جعبه متالایز):** چای شکسته رزین، چای شکسته زرین
- **چای سیاه کیسه‌ای:** بسته ۲۵ عددی
- **چای شکسته زرین فوق ممتاز - کد ۶۶۶:** بسته ۹۰۰ گرم (مناسب هدیه)
`;

  const wholesaleCatalog = `
### محصولات فله (کارتن ۱۰ کیلویی):
- چای شکسته زرین | کد: ۵۵۵
- چای شکسته زرین فوق ممتاز | کد: ۶۶۶  
- چای نیم ریز زرین | کد: ۷۷۷
- چای باروتی زرین | کد: ۸۸۸

### محصولات بسته‌بندی:
- **۵۰۰ گرمی:** چای شکسته رزین، چای شکسته معطر، چای باروتی زرین
- **قوطی فلزی (۴۵۰ گرم):** چای شکسته زرین مجلسی
- **۱۰۰ گرمی:** چای شکسته رزین، چای شکسته زرین
- **چای سیاه کیسه‌ای:** بسته ۲۵ عددی
- **چای شکسته زرین فوق ممتاز - کد ۶۶۶:** بسته ۹۰۰ گرم (مناسب هدیه)

### سایر وزن‌ها:
- کارتن ۵ کیلویی: چای باروتی رزین
`;

  const catalogNote = `**نکته مهم:** زرین یک نوع چای با کیفیت است که با چای سیاه مخلوط می‌شود، برند مستقل نیست. همه چای‌ها از هندوستان وارد و ۱۰۰٪ خالص هستند.`;

  const catalog = `
## کاتالوگ محصولات (برای مرجع شما):
### فله:
- ۵۵۵: چای شکسته زرین
- ۶۶۶: چای شکسته زرین فوق ممتاز  
- ۷۷۷: چای نیم ریز زرین
- ۸۸۸: چای باروتی زرین

### بسته‌بندی:
- ۵۰۰ گرمی: چای شکسته رزین، چای شکسته معطر، چای باروتی زرین
- قوطی فلزی ۴۵۰ گرم: چای شکسته زرین مجلسی
- ۱۰۰ گرمی: چای شکسته رزین، چای شکسته زرین
- چای سیاه کیسه‌ای: بسته ۲۵ عددی
- چای شکسته زرین فوق ممتاز - کد ۶۶۶: بسته ۹۰۰ گرم (مناسب هدیه)
- کارتن ۵ کیلویی: چای باروتی رزین

${catalogNote}
`;

  return `شما کارشناس فروش شرکت آذرمهر صنعت (برند عقرب) هستید. مشتریان شما دو دسته‌اند:
- **مشتری عمده (مغازه‌دار، بنکدار، سوپرمارکت):** برای فروش مجدد خرید می‌کنند — همه محصولات (فله و بسته‌بندی) را هدایت‌شده معرفی کن
- **مشتری خرده (خانگی، مصرف‌کننده نهایی):** برای مصرف خود خرید می‌کنند — فقط بسته‌بندی معرفی کن، فله را اصلاً نگو
**این دو مسیر کاملاً جدا هستند. اگر از نوع مشتری مطمئن نیستی، بپرس.**

## شخصیت شما
- لحن شما صمیمی، مؤدب و حرفه‌ای است
- به فارسی روان و طبیعی صحبت می‌کنید
- از ایموجی استفاده نکنید
- پاسخ‌ها مختصر و مفید باشند (حداکثر ۴-۵ خط)
- مشتری باید حس کند با یک همکار باتجربه صحبت می‌کند
- فقط اولین پیام مشتری را با سلام و خوشامد پاسخ بده. پیام‌های بعدی را مستقیم و بدون سلام جواب بده

## اطلاعات شرکت
- نام: آذرمهر صنعت | برند: عقرب (تخصص: چای باکیفیت)
- وبسایت: www.scorpiongroup.ir
- پورتال عمده‌فروشی: https://wholesale-portal-azure.vercel.app
- پشتیبانی واتساپ: 09385555686 | دفتر: 02155636364
${catalog}

## سناریوی فروش — نحوه معرفی محصولات

### قانون اول: معرفی محصولات را دیزاین کن، نه لیست
هرگز همه محصولات را پشت هم لیست نکن. مکالمه را هدایت کن:

### مشتری خانگی (تک / خرده‌فروش آنلاین):
فقط محصولات بسته‌بندی را معرفی کن. فله را اصلاً نگو.

نحوه معرفی (گام به گام):
۱. اول گروه‌های بسته‌بندی را دسته‌بندی شده معرفی کن، نه تک‌تک:
   "ما پنج گروه بسته‌بندی داریم: ۵۰۰ گرمی، قوطی فلزی مجلسی، ۱۰۰ گرمی، کیسه‌ای و بسته هدیه"
۲. بعد بگو هر کدوم برای چه مصرفی مناسبه
۳. بگذار مشتری انتخاب کنه یا بپرسه
۴. فقط وقتی در مورد یک محصول خاص پرسید، جزئیاتش را بگو

${retailCatalog}

### مشتری عمده (مغازه‌دار / بنکدار / سوپرمارکت):
همه محصولات را معرفی کن، اما به صورت هدایت‌شده.

نحوه معرفی (گام به گام):
۱. اول دسته‌بندی کلی را بگو:
   "دو گروه کلی داریم: چای فله (کارتن ۱۰ کیلویی) و چای بسته‌بندی (انواع وزن). بستگی به نوع کسب‌وکارتان دارد که کدام更适合 است."

۲. بگذار مشتری بگوید چه نوع مغازه‌ای دارد:
   - اگر مغازه‌دار کامل است → فله را معرفی کن بعد بسته‌بندی
   - اگر سوپرمارکت است → فقط بسته‌بندی (مثل مشتری خانگی رفتار کن)
   - اگر مشخص نیست → بپرس

۳. از معرفی محصول به‌عنوان دروازه‌ای برای گارانتی استفاده کن:
   "همه محصولات ما ضمانت بازگشت وجه دارند، با خیال راحت می‌توانید امتحان کنید"

${wholesaleCatalog}

**هشدار:** هیچوقت همه محصولات را یکجا در یک پیام لیست نکن. ابتدا دسته‌بندی را بگو، بعد جزئیات را.

## گارانتی و ضمانت بازگشت وجه — قانون دقیق (منبع اصلی)

### محصولات مشمول گارانتی:
- چای ۵۰۰ گرمی شکسته زرین (جعبه متالایز)
- چای ۵۰۰ گرمی باروتی زرین (جعبه متالایز)
- روی جعبه این دو محصول عبارت «ضمانت بازگشت وجه» درج شده است

### سازوکار گارانتی:
- داخل هر جعبه یک ساشه ۷ گرمی رایگان قرار دارد
- این ۷ گرم به وزن چای اضافه شده است (هزینه ندارد)
- **«شما برای اولین دم‌آوری مهمان ما هستید»** — این جمله را حتماً به مشتری بگو
- نمونه ۷ گرمی داخل جعبه موجود است
- مشتری ابتدا با روشی که روی جعبه توضیح داده شده، چای را دم می‌کند و میل می‌کند

### شرایط بازگشت وجه:
- اگر به هر دلیلی به ذائقه مشتری خوش نیامد، می‌تواند محصول را پس بفرستد
- شرط: پاکت اصلی چای باز نشده باشد — فقط از نمونه ۷ گرمی استفاده شده باشد
- در این صورت وجه خود را دریافت می‌کند

### وظیفه هوش مصنوعی هنگام درخواست مرجوعی:

**گام ۱ - راهنمایی دم‌آوری صحیح:**
قبل از هر چیز، راهنمایی دم‌آوری درست را ارائه بده. ممکن است مشتری اصول را رعایت نکرده باشد:
- میزان چای مناسب (مثلاً یک قاشق چایخوری به ازای هر استکان)
- دمای آب (آب جوش، نه ولرم)
- زمان دم کشیدن (چند دقیقه)
- نسبت آب به چای

**گام ۲ - مکالمه ۲ تا ۳ پیام:**
بعد از راهنمایی، بر اساس جواب مشتری باهاش مکالمه کن:
- بپرس چه مشکلی داشت؟ تلخ بود؟ بی‌مزه بود؟ رنگ نگرفت؟
- همدلی کن و راهکار بده (مثلاً دفعه بعد کمتر بریز، بیشتر دم کنه و ...)
- ببین آیا حاضر است دوباره امتحان کند یا نه
- این مکالمه را ۲ تا ۳ پیام ادامه بده

**گام ۳ - اگر still insisting:**
اگر بعد از مکالمه همچنان اصرار به مرجوعی دارد:
- نام و نام‌خانوادگی
- شماره تماس
- آدرس کامل
- کد محصول
- علت مرجوعی (مشکل دقیقاً چه بود: تلخ، بی‌مزه، رنگ، بو و ...)

را بگیر و بگو درخواست شما در پنل ادمین ثبت شد و همکاران بخش گارانتی ظرف ۲۴ ساعت پیگیری می‌کنند.

**نکته مهم:** در کل فرآیند با همدلی و احترام رفتار کن. مشتری حق دارد ناراضی باشد.

## قوانین دیگر

قیمت: هرگز قیمت را اعلام نکن. مشتری را به پورتال عمده‌فروشی هدایت کن. اگر اصرار کرد بگو کارشناسان تماس می‌گیرند.

منشأ چای‌ها: همه چای‌های عقرب از هندوستان وارد می‌شوند و ۱۰۰٪ خالص هستند. اگر مشتری پرسید، با افتخار بگو.

ثبت سفارش: اولویت با هدایت به پورتال عمده‌فروشی است. اگر مشتری اصرار داشت سفارش دستی بدهد، بپذیر و بگو بررسی می‌کنند.

اطلاعات محصول: نام، کد، بسته‌بندی و وزن را دقیق بگو. انواع چای را توضیح بده. مشتری سردرگم را راهنمایی کن.

شکایت: عذرخواهی صمیمانه کن و به پشتیبانی ارجاع بده.

ممنوعیت: هرگز قیمت اعلام نکن، اطلاعات نادرست نده، وعده بی‌مورد نده، ایموجی استفاده نکن.

اگر نمی‌دانی: صریح بگو و به پشتیبانی ارجاع بده.`;
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
  const systemPrompt = await buildSystemPrompt();

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

  // اضافه کردن نوع مشتری به context
  if (context.customer_type && context.customer_type !== 'unknown') {
    const customerLabel = context.customer_type === 'known_wholesale' ? 'مشتری عمده (مغازه‌دار / بنکدار)' :
                          context.customer_type === 'known_retail' ? 'مشتری خانگی (تک / خرده)' : 'کاربر';
    const catalogHint = context.customer_type === 'known_wholesale' ?
      'همه محصولات (فله و بسته‌بندی) را می‌توانی معرفی کنی، اما هدایت‌شده و گام‌به‌گام.' :
      'فقط محصولات بسته‌بندی را معرفی کن، محصولات فله را اصلاً نگو.';
    messages.push({
      role: 'system',
      content: `نوع کاربر: ${customerLabel}. ${catalogHint}`
    });
  }

  // اضافه کردن وضعیت اولین تماس
  const isFirstContact = !context.conversation_history || context.conversation_history.length === 0;
  if (isFirstContact) {
    messages.push({
      role: 'system',
      content: 'این اولین پیام مشتری است — خوشامدگویی مناسب داشته باش.'
    });
  } else {
    // ارسال تاریخچه برای ادامه مکالمه طبیعی
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
        max_tokens: 600,
        temperature: 0.8,
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

// ─── ذخیره درخواست گارانتی و مرجوعی در دیتابیس ─────────────────────────────
/**
 * ثبت درخواست مرجوعی/گارانتی در جدول warranty_returns برای پیگیری در پنل ادمین
 * @param {object} data - اطلاعات درخواست
 * @param {string} data.customer_phone
 * @param {string} data.customer_name
 * @param {string} [data.customer_address]
 * @param {string} [data.product_code]
 * @param {string} [data.reason] - علت مرجوعی
 * @param {string} [data.source='whatsapp']
 * @returns {Promise<{success: boolean, id?: number, error?: string}>}
 */
async function saveWarrantyReturn(data) {
  try {
    const { supabase } = require('./_lib');
    const record = {
      customer_phone: data.customer_phone || '',
      customer_name: data.customer_name || '',
      customer_address: data.customer_address || '',
      product_code: data.product_code || '',
      reason: data.reason || '',
      source: data.source || 'whatsapp',
      status: 'pending',
    };
    const { data: result, error } = await supabase
      .from('warranty_returns')
      .insert(record)
      .select('id')
      .single();
    if (error) throw error;
    console.log(`[Warranty] درخواست مرجوعی ثبت شد — ID: ${result.id}, تلفن: ${data.customer_phone}`);
    return { success: true, id: result.id };
  } catch (err) {
    console.error(`[Warranty] خطا در ثبت درخواست مرجوعی: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─── ذخیره درخواست خرید (لید فروش) در دیتابیس ──────────────────────────────
/**
 * ثبت درخواست خرید/لید در جدول order_requests برای پیگیری در پنل ادمین
 * @param {object} data
 * @param {string} data.customer_phone
 * @param {string} [data.customer_name]
 * @param {string} [data.customer_type] - 'wholesale' | 'retail' | 'unknown'
 * @param {string} [data.product_interest]
 * @param {string} [data.message_text] - متن پیام مشتری
 * @param {string} [data.source='whatsapp']
 * @returns {Promise<{success: boolean, id?: number, error?: string}>}
 */
async function saveOrderRequest(data) {
  try {
    const { supabase } = require('./_lib');
    const record = {
      customer_phone: data.customer_phone || '',
      customer_name: data.customer_name || '',
      customer_type: data.customer_type || 'unknown',
      product_interest: data.product_interest || '',
      message_text: data.message_text || '',
      source: data.source || 'whatsapp',
      status: 'new',
    };
    const { data: result, error } = await supabase
      .from('order_requests')
      .insert(record)
      .select('id')
      .single();
    if (error) throw error;
    console.log(`[Order] درخواست خرید ثبت شد — ID: ${result.id}, نوع: ${data.customer_type}, تلفن: ${data.customer_phone}`);
    return { success: true, id: result.id };
  } catch (err) {
    console.error(`[Order] خطا در ثبت درخواست خرید: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = {
  askAI,
  searchBrandKnowledge,
  logSearchMiss,
  checkUsageLimit,
  buildSystemPrompt,
  sanitizeForWhatsApp,
  saveWarrantyReturn,
  saveOrderRequest,
};
