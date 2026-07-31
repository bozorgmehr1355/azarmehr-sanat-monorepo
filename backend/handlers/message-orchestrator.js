/**
 * Central Message Orchestrator — Omnichannel Adapter Integration (v2)
 * =================================================================
 *
 * مطابق OMNICHANNEL_AI_AGENT_BLUEPRINT (خطوط ۱۰, ۱۷۰-۱۷۱, ۲۸۵, ۲۸۸-۳۰۱)
 * و SERVICE_CONTRACTS.md (خطوط ۱۱۴, ۱۱۶):
 *
 * - این orchestrator تنها جایی است که business logic (intent detection,
 *   decision, response generation) اجرا می‌شود.
 * - هیچ adapterای نباید business logic مستقل داشته باشد.
 * - هر adapter فقط normalize ورودی → call orchestrator → render خروجی.
 *
 * Intentهای پشتیبانی‌شده (15 نوع):
 *   greeting, help, order, product_query, price_query,
 *   warranty_query, warranty_refund, warranty_dissatisfaction,
 *   brand_question, education, contact, escalation, general,
 *   menu, unknown
 *
 * وابستگی‌ها: supabase از _lib.js (فقط برای lookupهای خواندنی در آینده)
 * در حال حاضر: هیچ DB write, هیچ AI — تمام پاسخ‌ها deterministic.
 *
 * @see docs/warranty-scenario.txt (مرجع گارانتی)
 * @see docs/retail-scenario-basteh.txt (مرجع خرده‌فروشی)
 * @see docs/wholesale-scenario-fale.txt (مرجع عمده‌فروشی)
 * @see محصولات.txt (SSOT نام محصولات)
 * @see whatsapp-broadcast-api/api/_intent.js (مرجع intent detection اصلی)
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// Constants — Contact & Portal
// ═══════════════════════════════════════════════════════════

const SUPPORT_PHONE = '09385555686';
const SALES_PHONE = '09038883000';
const WEBSITE = 'scorpiongroup.ir';
const RETAIL_URL = 'https://scorpiongroup.ir';
const PORTAL_URL = 'https://wholesale-portal-azure.vercel.app';
const BREW_GUIDE_URL = `${RETAIL_URL}/brew-guide`;
const BRAND_LINE = 'همه خریداران ۷ گرم چای مهمان عقرب هستند';

// ═══════════════════════════════════════════════════════════
// Constants — Intent Keywords (deterministic, no AI)
// ═══════════════════════════════════════════════════════════

const GREETING_KEYWORDS = [
  'سلام', 'درود', 'عرض ادب', 'سلاام',
  'hello', 'hi', 'hey', 'salam', 'dorood', 'slm',
  'good morning', 'good evening',
];

const HELP_KEYWORDS = [
  'کمک', 'راهنما', 'چطور', 'طرز', 'آموزش', 'نحوه', 'بلدم نیستم',
  'help', 'support', 'guide', 'how to',
  'چجوری', 'چطوری', 'چیکار کنم', 'راهنمایی',
];

const ORDER_KEYWORDS = [
  'سفارش', 'خرید', 'ثبت سفارش', 'سفارش میدم', 'سفارش دادم',
  'order', 'buy', 'purchase',
  'میخوام', 'می‌خوام', 'چند تا', 'برام بفرست', 'ارسال',
  'حواله', 'فاکتور', 'پیش فاکتور',
];

const PRODUCT_QUERY_KEYWORDS = [
  'چای دارید', 'چای داری', 'چای دارین', 'چای هست',
  'چای موجود', 'موجوده', 'موجود', 'چی دارید', 'چی داری',
  'محصولات', 'محصول', 'کالا', 'لیست محصولات', 'کاتالوگ',
  'tea', 'product', 'catalog', 'product list',
  'چای', 'دارین', 'هستن',
];

const PRICE_QUERY_KEYWORDS = [
  'قیمت چقدر', 'قیمت چنده', 'قیمت چقدره', 'قیمت چند',
  'قیمت محصولات', 'قیمت روز', 'قیمت امروز',
  'قیمتش چنده', 'قیمتش چقدر',
  'لیست قیمت',
  'price', 'how much',
  'قیمت', 'چنده', 'چقدر', 'چقدره', 'چند تومن', 'چند تومان',
  'نرخ', 'هزینه', 'تعرفه', 'price list',
];

const WARRANTY_KEYWORDS = [
  'گارانتی', 'ضمانت', 'بازگشت وجه', 'شرایط گارانتی',
  'warranty', 'guarantee',
];

const REFUND_KEYWORDS = [
  'پس میدم', 'پس دادن', 'مرجوع', 'عودت',
  'پس بگیر', 'تعویض میکنم',
  'refund', 'return', 'exchange',
];

const DISSATISFACTION_KEYWORDS = [
  'راضی نیستم', 'کیفیت بد', 'بی کیفیت', 'خرابه', 'خراب',
  'معیوب', 'بو میده', 'بدمزه', 'ناراضی', 'درجه چندم',
  'کیفیت نداشت', 'کیفیت خوب نبود', 'کیفیت پایین',
  'راضی نبودم', 'مشکل داشت', 'مشکل داره',
  'dissatisfied', 'not satisfied', 'bad quality',
];

const BRAND_QUESTION_KEYWORDS = [
  'زرین یعنی', 'زرین چیه', 'زرین چیست', 'معنی زرین',
  'فرق زرین', 'تفاوت', 'کدوم بهتره', 'کدوم بهتر',
  'مرغوبترین', 'مرغوب', 'درجه یک', 'اعلا',
  'what is zarrin', 'zarrin meaning',
  'برگاموت یعنی', 'برگاموت چیه',
  'طبیعیه', 'رنگ داره', 'اسانس داره',
  'عقرب یعنی', 'عقرب چیه', 'scorpion brand',
];

const EDUCATION_KEYWORDS = [
  'آموزش', 'آموزش محصول', 'آموزشی',
  'روش استفاده', 'نحوه استفاده', 'طریقه استفاده',
  'چطور استفاده کنم', 'چجوری استفاده کنم',
  'فیلم آموزشی', 'دفترچه راهنما', 'محتوای آموزشی',
  'راهنمای محصول', 'راهنمای استفاده',
  'tutorial', 'how to use', 'user guide',
];

const CONTACT_KEYWORDS = [
  'تماس', 'شماره تماس', 'تلفن', 'شماره تلفن',
  'آدرس', 'آدرس شرکت', 'موقعیت', 'لوکیشن',
  'اینستاگرام', 'پیج', 'ساعات کاری', 'ساعت کاری', 'راه ارتباطی',
  'contact', 'phone', 'address',
];

const ESCALATION_KEYWORDS = [
  'شکایت', 'اپراتور', 'کارشناس', 'مدیر', 'مسئول',
  'صحبت با', 'تماس بگیر', 'زنگ بزن',
  'complaint', 'operator', 'manager', 'human',
  'پشتیبانی',
];

const MENU_KEYWORDS = [
  'منو', 'خدمات', 'گزینه', 'menu',
  '0', // بازگشت به منو
];

const GENERAL_KEYWORDS = [
  'چطوری', 'خوبی', 'چه خبر', 'چطورین', 'خوبین', 'حالت',
  'شوخی', 'مزاح', 'فال', 'داستان', 'خنده',
  'خداحافظ', 'خدانگهدار', 'فعلا',
  'goodbye', 'bye', 'thanks', 'thank', 'مرسی', 'ممنون', 'تشکر',
  'ساعت چنده', 'ساعت چند',
];

// کلمات کلیدی شناسایی محصولات برای combo greeting+product
const COMBO_PRODUCT_SIGNALS = [
  'چای', 'چایی', 'قهوه',
  'دارید', 'داری', 'دارن', 'دارین',
  'موجود', 'موجوده',
  'قیمت', 'چنده', 'چقدر', 'چند',
  'بفرمایید',
];

// زیرنوع‌های PRODUCT_QUERY
const PRODUCT_PRICE_SIGNALS = [
  'قیمت', 'چنده', 'چقدر', 'چند', 'قیمتش', 'بقیمت', 'نرخ',
];
const PRODUCT_AVAILABILITY_SIGNALS = [
  'دارید', 'داری', 'دارن', 'دارین', 'هست', 'موجود', 'موجوده',
  'داره', 'دارن', 'هستش', 'هستن',
];

// ═══════════════════════════════════════════════════════════
// Lazy Supabase — فقط در صورت نیاز
// ═══════════════════════════════════════════════════════════

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    try {
      const lib = require('./_lib');
      _supabase = lib.supabase;
    } catch (e) {
      console.warn('[message-orchestrator] Supabase not available:', e.message);
      return null;
    }
  }
  return _supabase;
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function generateCorrelationId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `orch_${ts}_${rand}`;
}

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.trim().replace(/\s+/g, ' ')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/\u200C/g, ' ')
    .toLowerCase();
  // حذف کاراکترهای غیرمجاز (نگه داشتن حروف فارسی، انگلیسی، اعداد)
  s = s.replace(/[^\w\s\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u0698\u06A9\u06CC\u06F0-\u06F9]/g, '');
  return s.trim();
}

function matchKeywords(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.some((kw) => normalized.includes(normalizeText(kw)));
}

// ═══════════════════════════════════════════════════════════
// Intent Detection (15 intent types)
// ═══════════════════════════════════════════════════════════

function detectIntent(text) {
  if (!text) return 'unknown';
  const normalized = normalizeText(text);

  // ── Price-before-Combo: اگر نشانه قیمت هست، همیشه price_query ──
  // (مطابق WhatsApp _intent.js: price before combo check)
  const hasPriceSignal = PRICE_QUERY_KEYWORDS.some(k => normalized.includes(k));
  if (hasPriceSignal) {
    return 'price_query';
  }

  // ── Combo: Greeting + Product → product_query ──────────
  const comboGreeting = ['سلام', 'درود', 'خوبی', 'هستی', 'صبح', 'شب', 'روز', 'عصر'];
  const hasGreeting = comboGreeting.some(w => normalized.includes(w));
  const hasProductSignal = COMBO_PRODUCT_SIGNALS.some(w => normalized.includes(w));
  if (hasGreeting && hasProductSignal) {
    return 'product_query';
  }

  // ── Intent priority order (مطابق _intent.js) ──────────

  // اولویت ۱: ORDER
  if (matchKeywords(text, ORDER_KEYWORDS)) return 'order';

  // اولویت ۲: PRICE_QUERY
  if (matchKeywords(text, PRICE_QUERY_KEYWORDS)) return 'price_query';

  // اولویت ۳: ESCALATION
  if (matchKeywords(text, ESCALATION_KEYWORDS)) return 'escalation';

  // اولویت ۴: WARRANTY_DISSATISFACTION
  if (matchKeywords(text, DISSATISFACTION_KEYWORDS)) return 'warranty_dissatisfaction';

  // اولویت ۵: WARRANTY_REFUND
  if (matchKeywords(text, REFUND_KEYWORDS)) return 'warranty_refund';

  // اولویت ۶: EDUCATION
  if (matchKeywords(text, EDUCATION_KEYWORDS)) return 'education';

  // اولویت ۷: HELP
  if (matchKeywords(text, HELP_KEYWORDS)) return 'help';

  // اولویت ۸: BRAND_QUESTION
  if (matchKeywords(text, BRAND_QUESTION_KEYWORDS)) return 'brand_question';

  // اولویت ۹: WARRANTY_QUERY
  if (matchKeywords(text, WARRANTY_KEYWORDS)) return 'warranty_query';

  // اولویت ۱۰: CONTACT
  if (matchKeywords(text, CONTACT_KEYWORDS)) return 'contact';

  // اولویت ۱۱: MENU
  if (matchKeywords(text, MENU_KEYWORDS)) return 'menu';

  // اولویت ۱۲: PRODUCT_QUERY
  if (matchKeywords(text, PRODUCT_QUERY_KEYWORDS)) return 'product_query';

  // اولویت ۱۳: GENERAL
  if (matchKeywords(text, GENERAL_KEYWORDS)) return 'general';

  // اولویت ۱۴: GREETING
  if (matchKeywords(text, GREETING_KEYWORDS)) return 'greeting';

  // Default
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════
// Response Templates (inline — no DB, no AI)
// ═══════════════════════════════════════════════════════════

const RESPONSES = {
  greeting: {
    text: 'سلام! به گروه محصولات غذایی عقرب خوش آمدید.\n'
      + 'خرید شما عمده است یا خرده؟',
    quickReplies: [
      { label: '🏪 خرید خرده', value: 'retail' },
      { label: '🏢 خرید عمده', value: 'wholesale' },
      { label: 'ℹ️ راهنما', value: 'help' },
    ],
  },

  help: {
    text: 'راهنمای سریع:\n\n'
      + '۱. برای مشاهده محصولات، کلمه "محصولات" را بفرستید.\n'
      + '۲. برای استعلام قیمت محصول خاص، نام محصول را بفرستید.\n'
      + '۳. برای ثبت سفارش، به پرتال فروشگاه مراجعه کنید:\n'
      + `   ${RETAIL_URL}\n\n`
      + 'یا با پشتیبانی تماس بگیرید: ' + SUPPORT_PHONE,
    quickReplies: [
      { label: '📦 محصولات', value: 'products' },
      { label: '📞 پشتیبانی', value: 'contact' },
      { label: '🛒 سفارش', value: 'order' },
    ],
  },

  order: {
    text: 'برای ثبت سفارش:\n\n'
      + '🛒 **خرید خرده**:\n'
      + 'از فروشگاه آنلاین عقرب اقدام بفرمایید:\n'
      + RETAIL_URL + '\n\n'
      + '🏢 **خرید عمده**:\n'
      + 'از طریق پخش عقرب اقدام بفرمایید:\n'
      + PORTAL_URL + '\n\n'
      + '📞 پشتیبانی: ' + SUPPORT_PHONE,
    quickReplies: [
      { label: '🛒 فروشگاه خرده', value: 'retail_url' },
      { label: '🏢 پخش عمده', value: 'wholesale_url' },
      { label: '📞 تماس', value: 'contact' },
    ],
  },

  product_query: {
    text: 'برای مشاهده محصولات ما:\n\n'
      + '🛒 **محصولات بسته‌بندی (خرده فروشی):**\n'
      + '• چای شکسته رزین عقرب (۱۰۰ و ۵۰۰ گرمی)\n'
      + '• چای شکسته عطری عقرب (۵۰۰ گرمی)\n'
      + '• چای باروتی زرین عقرب (۵۰۰ گرمی)\n'
      + '• چای شکسته زرین فوق ممتاز عقرب کد ۶۶۶ (۹۰۰ گرمی)\n'
      + '• چای شکسته زرین اعلا عقرب قوطی فلزی (۴۵۰ گرمی)\n'
      + '• چای کیسه‌ای عقرب (۲۵ عددی)\n\n'
      + '🏢 **محصولات عمده (فله):**\n'
      + '• چای باروتی زرین کد ۸۸۸ (۱۰ کیلویی)\n'
      + '• چای نیم ریز زرین کد ۷۷۷ (۱۰ کیلویی)\n'
      + '• چای شکسته زرین کد ۵۵۵ (۱۰ کیلویی)\n'
      + '• چای شکسته فوق ممتاز زرین کد ۶۶۶ (۱۰ کیلویی)\n'
      + '• چای باروتی عقرب (۵ کیلویی)',
    quickReplies: [
      { label: '🤔 راهنمای سلیقه', value: 'taste_guide' },
      { label: '🏪 فروشگاه آنلاین', value: 'retail_url' },
      { label: '📞 پشتیبانی', value: 'contact' },
    ],
  },

  price_query: {
    text: 'برای اطلاع از قیمت محصولات:\n\n'
      + '🛒 **قیمت خرده فروشی:**\n'
      + 'می‌توانید به فروشگاه آنلاین عقرب مراجعه بفرمایید:\n'
      + RETAIL_URL + '\n\n'
      + '🏢 **قیمت عمده:**\n'
      + 'لطفاً از طریق پخش عقرب اقدام بفرمایید:\n'
      + PORTAL_URL + '\n\n'
      + '📞 پشتیبانی: ' + SUPPORT_PHONE + '\n'
      + '📞 واحد فروش: ' + SALES_PHONE,
    quickReplies: [
      { label: '🛒 فروشگاه خرده', value: 'retail_url' },
      { label: '🏢 پخش عمده', value: 'wholesale_url' },
      { label: '📞 تماس', value: 'contact' },
    ],
  },

  warranty_query: {
    text: '**ضمانت بازگشت وجه** برای دو محصول عقرب فعال است:\n\n'
      + '📦 محصولات مشمول:\n'
      + '• چای شکسته زرین ۵۰۰ گرمی عقرب\n'
      + '• چای باروتی زرین ۵۰۰ گرمی عقرب\n\n'
      + '✅ شرایط استفاده:\n'
      + '• فقط از نمونه ۷ گرمی داخل جعبه استفاده شده باشد\n'
      + '• پاکت اصلی محصول باز نشده باشد\n\n'
      + `💡 ${BRAND_LINE}\n`
      + 'داخل جعبه یک نمونه ۷ گرمی رایگان قرار دارد.\n\n'
      + '📋 مراحل اقدام:\n'
      + 'اگر شرایط را دارید، روش دم‌آوری خود را توضیح دهید تا راهنمایی کنیم.',
    quickReplies: [
      { label: 'ℹ️ شرایط کامل', value: 'warranty_full' },
      { label: '📞 پشتیبانی', value: 'contact' },
      { label: '🛒 فروشگاه', value: 'retail_url' },
    ],
  },

  warranty_dissatisfaction: {
    text: 'از نارضایتی شما متأسفیم.\n\n'
      + `در این محصول، **ضمانت بازگشت وجه** در نظر گرفته شده است.\n`
      + `${BRAND_LINE} — داخل جعبه یک نمونه ۷ گرمی رایگان قرار دارد.\n\n`
      + 'برای اینکه بتوانیم دقیق‌تر راهنمایی کنیم، لطفاً بفرمایید:\n'
      + '۱. آیا فقط از **نمونه ۷ گرمی** استفاده کرده‌اید؟\n'
      + '۲. آیا **پاکت اصلی چای** همچنان **باز نشده** است؟\n'
      + '۳. چای را تقریباً با چه روشی دم کرده‌اید؟',
    quickReplies: [
      { label: '✅ فقط نمونه استفاده شده', value: 'warranty_sample_only' },
      { label: '❌ پاکت باز شده', value: 'warranty_not_eligible' },
      { label: '📞 پشتیبانی', value: 'contact' },
    ],
  },

  warranty_refund: {
    text: 'درخواست بازگشت وجه شما ثبت شد.\n\n'
      + 'لطفاً برای ثبت در بخش گارانتی، این اطلاعات را ارسال بفرمایید:\n'
      + '• نام و نام خانوادگی\n'
      + '• شماره تماس\n'
      + '• نام محصول\n'
      + '• آدرس کامل\n'
      + '• کدپستی\n'
      + '• شهر و استان\n'
      + '• علت درخواست\n'
      + '• تأیید اینکه فقط از نمونه ۷ گرمی استفاده شده و پاکت اصلی باز نشده است\n\n'
      + `📞 پشتیبانی: ${SUPPORT_PHONE}`,
    quickReplies: [
      { label: '📞 تماس با پشتیبانی', value: 'contact' },
    ],
  },

  brand_question: {
    text: '**برند زرین عقرب** — نشان‌دهنده باکیفیت‌ترین محصولات گروه غذایی عقرب است.\n\n'
      + '✨ **زرین** به معنی طلایی و باارزش است — محصولات زرین از مرغوب‌ترین مواد اولیه تهیه می‌شوند.\n\n'
      + '🦂 **عقرب** برند اصلی گروه محصولات غذایی عقرب (آذرمهر صنعت) است.\n\n'
      + '📦 انواع چای عقرب:\n'
      + '• چای شکسته رزین — طعم متعادل، مصرف روزانه\n'
      + '• چای شکسته عطری — دارای اسانس برگاموت، خوش‌عطر\n'
      + '• چای باروتی زرین — پررنگ و قوی\n'
      + '• چای شکسته زرین فوق ممتاز — ویژه و باکیفیت',
    quickReplies: [
      { label: '🛒 مشاهده محصولات', value: 'products' },
      { label: '📞 پشتیبانی', value: 'contact' },
      { label: 'ℹ️ راهنما', value: 'help' },
    ],
  },

  education: {
    text: '**بخش آموزش محصولات عقرب**\n\n'
      + '☕ **روش استاندارد دم‌آوری چای:**\n'
      + '• از آب تازه استفاده کنید\n'
      + '• آب را به جوش آورده، سپس کمی صبر کنید\n'
      + '• به ازای هر ۷ گرم چای، حدود ۱۵۰-۲۰۰ میلی‌لیتر آب جوش\n'
      + '• چای را در قوری ریخته و آب جوش اضافه کنید\n'
      + '• ۱۰-۱۵ دقیقه صبر کنید تا دم بکشد\n'
      + '• از جوشاندن مستقیم چای خودداری کنید\n\n'
      + '📖 راهنمای کامل دم‌آوری:\n'
      + BREW_GUIDE_URL + '\n\n'
      + '📞 پشتیبانی: ' + SUPPORT_PHONE,
    quickReplies: [
      { label: '📖 راهنمای دم‌آوری', value: 'brew_guide' },
      { label: '📞 پشتیبانی', value: 'contact' },
      { label: 'ℹ️ راهنما', value: 'help' },
    ],
  },

  contact: {
    text: '**اطلاعات تماس گروه محصولات غذایی عقرب**\n\n'
      + '📞 پشتیبانی: ' + SUPPORT_PHONE + '\n'
      + '📞 واحد فروش: ' + SALES_PHONE + '\n'
      + '🌐 وبسایت: ' + WEBSITE + '\n'
      + '📸 اینستاگرام: @scorpiongrups\n\n'
      + '🛒 فروشگاه آنلاین خرده فروشی:\n'
      + RETAIL_URL + '\n\n'
      + '🏢 پخش عمده:\n'
      + PORTAL_URL + '\n\n'
      + 'ساعت کاری: ۸ صبح تا ۱۷ (شنبه تا چهارشنبه)',
    quickReplies: [
      { label: '🛒 فروشگاه', value: 'retail_url' },
      { label: '🏢 پخش عمده', value: 'wholesale_url' },
      { label: 'ℹ️ راهنما', value: 'help' },
    ],
  },

  escalation: {
    text: 'درخواست شما ثبت شد. کارشناسان پشتیبانی در ساعت اداری با شما تماس می‌گیرند.\n\n'
      + '📞 پشتیبانی: ' + SUPPORT_PHONE + '\n'
      + '🌐 وبسایت: ' + WEBSITE,
    quickReplies: [
      { label: '📞 پشتیبانی', value: 'contact' },
      { label: 'ℹ️ راهنما', value: 'help' },
    ],
    requiresHuman: true,
  },

  menu: {
    text: '🦂 **آذرمهر صنعت (عقرب) — منوی خدمات**\n\n'
      + '۱. خرید عمده\n'
      + '۲. خرید خرده\n'
      + '۳. پیگیری سفارشات\n'
      + '۴. گارانتی و خدمات پس از فروش\n'
      + '۵. راهنمای محصولات\n'
      + '۶. ارتباط با کارشناس پشتیبانی\n'
      + '۷. راهنمای خرید\n\n'
      + 'لطفاً عدد گزینه مورد نظر را ارسال کنید.\n'
      + 'برای ارتباط مستقیم با پشتیبانی، عدد ۹ را ارسال کنید.',
    quickReplies: [
      { label: '۱', value: 'wholesale' },
      { label: '۲', value: 'retail' },
      { label: '۴', value: 'warranty' },
      { label: '۶', value: 'contact' },
      { label: '۷', value: 'help' },
    ],
  },

  general: {
    text: 'لطفاً نام محصول یا کد مورد نظر خود را ارسال کنید.\n\n'
      + 'مثال:\n'
      + '• "چای باروتی"\n'
      + '• "قیمت ۶۶۶"\n'
      + '• "محصولات"\n\n'
      + '📞 پشتیبانی: ' + SUPPORT_PHONE,
    quickReplies: [
      { label: '📦 محصولات', value: 'products' },
      { label: '📞 تماس', value: 'contact' },
      { label: 'ℹ️ راهنما', value: 'help' },
    ],
  },

  unknown: {
    text: 'متوجه پیام شما نشدم. لطفاً یکی از گزینه‌های زیر را انتخاب کنید یا پیام خود را واضح‌تر ارسال نمایید.',
    quickReplies: [
      { label: 'ℹ️ راهنما', value: 'help' },
      { label: '📦 محصولات', value: 'products' },
      { label: '📞 تماس', value: 'contact' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// processMessage — Core Orchestrator Function
// ═══════════════════════════════════════════════════════════

/**
 * پردازش پیام normalized و برگرداندن ResponseModel.
 *
 * @param {Object} normalizedRequest
 * @param {string} normalizedRequest.channel
 * @param {string} [normalizedRequest.messageType]
 * @param {string} normalizedRequest.senderId
 * @param {string} [normalizedRequest.recipientId]
 * @param {string} [normalizedRequest.timestamp]
 * @param {string} [normalizedRequest.text]
 * @param {Array}  [normalizedRequest.attachments]
 * @param {Object} [normalizedRequest.context]
 * @param {string} [normalizedRequest.correlation_id]
 * @param {Object} [options]
 * @param {boolean} [options.forceHuman]
 * @returns {Object} ResponseModel
 */
async function processMessage(normalizedRequest, options = {}) {
  // ── 1. Input validation ─────────────────────────────
  if (!normalizedRequest || typeof normalizedRequest !== 'object') {
    return {
      recipientId: null,
      messageType: 'text',
      text: 'درخواست نامعتبر است. لطفاً درخواست خود را بررسی کنید.',
      attachments: [],
      quickReplies: [],
      actions: [],
      metadata: {
        intent: 'error',
        channel: 'unknown',
        correlation_id: generateCorrelationId(),
        requires_human: true,
        error: 'invalid_request_structure',
      },
    };
  }

  const {
    channel,
    messageType = 'text',
    senderId,
    recipientId = null,
    timestamp = new Date().toISOString(),
    text = '',
    attachments = [],
    context = {},
    correlation_id: incomingCorrelationId,
  } = normalizedRequest;

  const correlationId = incomingCorrelationId || generateCorrelationId();

  // ── 2. Validate required fields ────────────────────
  const errors = [];
  if (!channel || typeof channel !== 'string') errors.push('channel');
  if (!senderId || typeof senderId !== 'string') errors.push('senderId');
  if (!text && (!attachments || attachments.length === 0)) {
    errors.push('text or attachments');
  }

  if (errors.length > 0) {
    return {
      recipientId: senderId || null,
      messageType: 'text',
      text: 'پیام نامعتبر است. لطفاً دوباره تلاش کنید.',
      attachments: [],
      quickReplies: [],
      actions: [],
      metadata: {
        intent: 'error',
        channel: channel || 'unknown',
        correlation_id: correlationId,
        requires_human: true,
        error: `missing_required_fields: ${errors.join(', ')}`,
      },
    };
  }

  // ── 3. Force-human override ────────────────────────
  if (options.forceHuman) {
    return {
      recipientId: senderId,
      messageType: 'text',
      text: 'پیام شما به اپراتور انسانی ارجاع داده شد. لطفاً شکیبا باشید.',
      attachments: [],
      quickReplies: [],
      actions: [{ type: 'escalate', label: 'ارجاع به اپراتور', value: 'escalate' }],
      metadata: {
        intent: 'escalated',
        channel,
        correlation_id: correlationId,
        requires_human: true,
        source: 'force_human_override',
      },
    };
  }

  // ── 4. Intent Detection ────────────────────────────
  const intentName = detectIntent(text);

  // ── 5. Build Response ──────────────────────────────
  const template = RESPONSES[intentName] || RESPONSES.unknown;

  const response = {
    recipientId: senderId,
    messageType: 'text',
    text: template.text,
    attachments: [],
    quickReplies: (template.quickReplies || []).map((qr) => ({
      label: qr.label,
      value: qr.value,
      type: 'quick_reply',
    })),
    actions: [],
    metadata: {
      intent: intentName,
      channel,
      correlation_id: correlationId,
      requires_human: template.requiresHuman === true,
      source: 'message-orchestrator',
      processing_time_ms: 0,
    },
  };

  return response;
}

// ═══════════════════════════════════════════════════════════
// Vercel-style handler mount
// ═══════════════════════════════════════════════════════════

async function handler(req, res) {
  const { cors } = require('./_lib');
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'فقط POST مجاز است' });
  }

  try {
    const result = await processMessage(req.body, {
      forceHuman: req.query?.forceHuman === 'true',
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[message-orchestrator] Handler error:', err.message);
    return res.status(500).json({
      recipientId: null,
      messageType: 'text',
      text: 'خطای داخلی سرور. لطفاً بعداً تلاش کنید.',
      attachments: [],
      quickReplies: [],
      actions: [],
      metadata: {
        intent: 'error',
        channel: req.body?.channel || 'unknown',
        correlation_id: req.body?.correlation_id || 'none',
        requires_human: true,
        error: 'internal_error',
      },
    });
  }
}

module.exports = { processMessage, handler, detectIntent };
