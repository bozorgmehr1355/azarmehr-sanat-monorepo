/**
 * Intent Detection Engine — Agent v1.5
 * =====================================
 * تشخیص قصد کاربر از روی متن پیام واتساپ
 * کاملاً keyword-based، بدون نیاز به API خارجی
 *
 * انواع Intent:
 *   GREETING         → سلام و احوالپرسی
 *   HELP             → درخواست راهنما
 *   ORDER            → قصد خرید / سفارش
 *   BRAND_QUESTION   → سوال درباره برند (زرین یعنی چی؟)
 *   EDUCATION        → درخواست آموزش / راهنمای استفاده
 *   PRICE_QUERY      → سوال قیمت (چنده؟ چقدره؟)
 *   CONTACT          → اطلاعات تماس
 *   PRODUCT_QUERY    → سوال درباره محصول
 *   ESCALATION       → درخواست اپراتور / شکایت
 *   FALLBACK         → هیچکدام
 *   DISSATISFACTION  → ابراز نارضایتی از محصول
 *   REFUND_REQUEST   → درخواست بازگشت وجه / مرجوعی
 *   WARRANTY_QUERY   → سوال درباره گارانتی و ضمانت
 */

'use strict';

// ─── اطلاعات تماس ─────────────────────────────────────────────────────────
const SUPPORT_PHONE = '09385555686';
const SALES_PHONE = '09038883000';
const OFFICE_PHONE = '02155636364';
const WEBSITE = 'www.scorpiongroup.ir';
const INSTAGRAM = '@scorpiongrups';
const PORTAL_URL = 'https://wholesale-portal-azure.vercel.app';
const RETAIL_URL = 'https://scorpiongroup.ir';
const BREW_GUIDE_URL = `${RETAIL_URL}/brew-guide`;

// ─── کلمات کلیدی هر Intent ───────────────────────────────────────────────

const GREETING_KEYWORDS = [
  'سلام', 'درود', 'عرض ادب', 'سلاام',
  'hello', 'hi', 'hey', 'good morning', 'good evening',
  'salam', 'dorood', 'slm',
];

const HELP_KEYWORDS = [
  'کمک', 'راهنما', 'چطور', 'طرز', 'آموزش', 'نحوه', 'بلدم نیستم',
  'help', 'support', 'guide', 'how to', 'i don\'t know',
  'چجوری', 'چطوری', 'چیکار کنم',
];

const ORDER_KEYWORDS = [
  'سفارش', 'خرید', 'ثبت سفارش', 'سفارش میدم', 'سفارش دادم',
  'order', 'buy', 'purchase',
  'میخوام', 'می‌خوام', 'چند تا', 'برام بفرست', 'ارسال',
  'حواله', 'فاکتور', 'پیش فاکتور',
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

const GENERAL_KEYWORDS = [
  'چطوری', 'خوبی', 'چه خبر', 'چطورین', 'خوبین', 'حالت',
  'ساعت چنده', 'ساعت چند', 'تاریخ', 'تقویم',
  'شوخی', 'مزاح', 'فال', 'داستان', 'خنده',
  'خداحافظ', 'خدانگهدار', 'فعلا',
  'goodbye', 'bye', 'thanks', 'thank', 'مرسی', 'ممنون', 'تشکر',
];

const PRICE_QUERY_KEYWORDS = [
  'قیمت چقدر', 'قیمت چنده', 'قیمت چقدره', 'قیمت چند',
  'قیمت محصولات', 'قیمت روز', 'قیمت امروز',
  'قیمتش چنده', 'قیمتش چقدر',
  'لیست قیمت',
  'price', 'how much',
  // کلمات افزوده شده برای پوشش بهتر
  'قیمت', 'چنده', 'چقدر', 'چقدره', 'چند تومن', 'چند تومان',
  'نرخ', 'هزینه', 'تعرفه', 'price list',
];

const CONTACT_KEYWORDS = [
  'تماس',
  'شماره تماس',
  'تلفن',
  'شماره تلفن',
  'آدرس',
  'آدرس شرکت',
  'موقعیت',
  'لوکیشن',
  'اینستاگرام',
  'پیج',
  'ساعات کاری',
  'ساعت کاری',
  'راه ارتباطی',
  'contact',
  'phone',
  'address',
];

const ESCALATION_KEYWORDS = [
  'شکایت', 'اپراتور', 'کارشناس', 'مدیر', 'مسئول',
  'صحبت با', 'تماس بگیر', 'زنگ بزن', 'پشتیبانی',
  'complaint', 'operator', 'manager', 'human',
];

const DISSATISFACTION_KEYWORDS = [
  'راضی نیستم', 'کیفیت بد', 'بی کیفیت', 'خرابه', 'خراب',
  'معیوب', 'بو میده', 'بدمزه', 'ناراضی', 'درجه چندم',
  'کیفیت نداشت', 'کیفیت خوب نبود', 'کیفیت پایین',
  'راضی نبودم', 'مشکل داشت', 'مشکل داره',
  'dissatisfied', 'not satisfied', 'bad quality',
];

const REFUND_KEYWORDS = [
  'پس میدم', 'پس دادن', 'مرجوع', 'عودت',
  'پس بگیر', 'تعویض میکنم',
  'refund', 'return', 'exchange',
];

const WARRANTY_KEYWORDS = [
  'گارانتی', 'ضمانت', 'بازگشت وجه', 'شرایط گارانتی',
  'warranty', 'guarantee',
];

// ─── آموزش محصول ────────────────────────────────────────────────────────────
const EDUCATION_KEYWORDS = [
  'آموزش', 'آموزش محصول', 'آموزشی',
  'روش استفاده', 'نحوه استفاده', 'طریقه استفاده',
  'چطور استفاده کنم', 'چجوری استفاده کنم',
  'فیلم آموزشی', 'دفترچه راهنما', 'محتوای آموزشی',
  'راهنمای محصول', 'راهنمای استفاده',
  'tutorial', 'how to use', 'user guide',
];

// ─── کلمات Escalation نرم (قابل override توسط context محصول/قیمت) ─────────
const SOFT_ESCALATION_KEYWORDS = [
  'پشتیبانی', 'کارشناس', 'مسئول',
  // کلماتی که کاربر معمولی ممکن است در استعلام محصول استفاده کند
  // اما قصد واقعی Escalation (شکایت/اپراتور) ندارد
];

// ─── زمینه محصول/قیمت — ترکیبی از نشانه‌های تجاری و محصولی ─────────────
// برای Gate نرم Escalation استفاده می‌شود
const PRODUCT_CONTEXT_KEYWORDS = [
  // دسته‌بندی‌های محصول
  'چای', 'چایی', 'قهوه',
  'شکسته', 'باروتی', 'نیم ریز', 'نیم‌ریز',
  'کیسه', 'کیسه‌ای', 'کیسه ای', 'تی بگ', 'تی‌بگ',
  // برندها
  'زرین', 'رزین', 'عقرب',
  // خرید و سفارش
  'خرید', 'فروش', 'سفارش', 'فاکتور', 'حواله', 'پیش فاکتور', 'ثبت سفارش',
  // محصول و کالا
  'محصول', 'محصولات', 'کالا', 'کاتالوگ', 'کد',
  // قیمت
  'قیمت', 'چنده', 'چقدر', 'چقدره', 'نرخ', 'هزینه', 'تومان', 'تومنه',
  // موجودی و استعلام
  'موجود', 'موجوده', 'دارید', 'دارین', 'داره', 'دارن',
  // وزن و بسته‌بندی
  'کیلو', 'گرم', 'بسته', 'کارتن', 'قوطی', 'جعبه',
  // کلمات کلیدی عمومی محصول از محصولات.txt
  'فوق ممتاز', 'مجلسی', 'معطر',
];

const PRODUCT_QUERY_KEYWORDS = [
  'چای دارید', 'چای داری', 'چای دارین', 'چای هست',
  'چای موجود', 'موجوده', 'موجود', 'چی دارید', 'چی داری',
  'محصولات', 'محصول', 'کالا', 'لیست محصولات', 'کاتالوگ',
  'tea', 'product', 'catalog', 'product list',
  // کلیدواژه‌های پهن‌دامنه برای پوشش عباراتی مثل "چای باروتی دارین؟"
  'چای', 'دارین', 'هستن',
  // کلیدواژه‌های مرتبط با فروش و سفارش (F11 hotfix)
  'فروش', 'قیمت', 'سفارش', 'خرید', 'کارشناس فروش',
  'بخش فروش', 'واحد فروش', 'پشتیبانی فروش',
];

// زیرنوع‌های PRODUCT_QUERY
const PRODUCT_PRICE_SIGNALS = [
  'قیمت', 'چنده', 'چقدر', 'چند', 'قیمتش', 'بقیمت', 'نرخ',
];
const PRODUCT_AVAILABILITY_SIGNALS = [
  'دارید', 'داری', 'دارن', 'دارین', 'هست', 'موجود', 'موجوده',
  'داره', 'دارن', 'هستش', 'هستن',
];

// ─── توابع کمکی ──────────────────────────────────────────────────────────

/**
 * نرمال‌سازی متن: حذف فاصله مجازی، یکسان‌سازی حروف
 */
function normalizeText(text) {
  if (!text) return '';
  let s = String(text).toLowerCase().trim();
  s = s.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  s = s.replace(/\u200C/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * بررسی وجود یکی از کلمات کلیدی در متن
 */
function hasKeyword(text, keywords) {
  if (!text) return false;
  const normalized = normalizeText(text);
  return keywords.some(k => normalized.includes(normalizeText(k)));
}

/**
 * بررسی زمینه محصول/قیمت در متن — برای Gate نرم Escalation
 * اگر پیام حاوی نشانه‌های محصول، قیمت، خرید، یا برند باشد → true
 * این تابع برای جلوگیری از Escalation نادرست پیام‌های استعلام محصول استفاده می‌شود
 */
function hasProductOrPriceContext(text) {
  if (!text) return false;
  const normalized = normalizeText(text);

  // بررسی نشانه‌های مستقیم از PRODUCT_CONTEXT_KEYWORDS
  for (const kw of PRODUCT_CONTEXT_KEYWORDS) {
    if (normalized.includes(normalizeText(kw))) return true;
  }

  // بررسی نشانه‌های ORDER_KEYWORDS (تکمیل)
  for (const kw of ORDER_KEYWORDS) {
    if (normalized.includes(normalizeText(kw))) return true;
  }

  // بررسی نشانه‌های PRODUCT_QUERY_KEYWORDS (تکمیل)
  for (const kw of PRODUCT_QUERY_KEYWORDS) {
    if (normalized.includes(normalizeText(kw))) return true;
  }

  return false;
}

/**
 * تشخیص قصد اصلی پیام
 * @param {string} message - متن خام پیام کاربر
 * @returns {{ intent: string, matched_keyword?: string, sub_intent?: string }}
 */
function detectIntent(message) {
  if (!message) {
    return { intent: 'FALLBACK' };
  }

  const text = String(message);

  // ===== COMBO CHECK: Greeting + Product → Product wins =====
  const normalizedText = normalizeText(text);

  // اولویت قیمت بر combo — اگر نشانه قیمت هست، همیشه PRICE_QUERY
  const hasPriceSignal = PRICE_QUERY_KEYWORDS.some(k =>
    normalizedText.includes(k)
  );
  if (hasPriceSignal) {
    return { intent: 'PRICE_QUERY', matched_keyword: 'price_before_combo' };
  }

  const comboGreeting = ['سلام', 'درود', 'خوبی', 'هستی', 'صبح', 'شب', 'روز', 'عصر'];
  const comboProduct  = [
    'چای', 'چایی',
    'قهوه',
    'دارید', 'داری', 'دارن', 'دارین',
    'موجود', 'موجوده',
    'قیمت', 'چنده', 'چقدر', 'چند',
    'بفرمایید'
  ];
  const hasGreeting = comboGreeting.some(w => normalizedText.includes(w));
  const hasProduct  = comboProduct.some(w => normalizedText.includes(w));
  if (hasGreeting && hasProduct) {
    let productSubtype = 'GENERAL';
    if (PRODUCT_PRICE_SIGNALS.some(w => normalizedText.includes(w))) {
      productSubtype = 'PRICE';
    } else if (PRODUCT_AVAILABILITY_SIGNALS.some(w => normalizedText.includes(w))) {
      productSubtype = 'AVAILABILITY';
    }
    return { intent: 'PRODUCT_QUERY', subtype: productSubtype, matched_keyword: 'combo_greeting+product' };
  }
  // ===== END COMBO CHECK =====

  // ===== SALES-GATE: عبارت‌های ترکیبی فروش قبل از escalation =====
  const SALES_ESCALATION_PHRASES = [
    'کارشناس فروش', 'بخش فروش', 'واحد فروش', 'پشتیبانی فروش',
    'مسئول فروش', 'اپراتور فروش', 'با فروش صحبت'
  ];
  if (SALES_ESCALATION_PHRASES.some(phrase => normalizedText.includes(phrase))) {
    return { intent: 'PRODUCT_QUERY', matched_keyword: 'sales_escalation_phrase' };
  }
  // ===== END SALES-GATE =====

  // ===== PRODUCT AMBIGUITY GATE (Hot-fix v2) =====
  // اگر پیام هم نشانه محصول و هم نشانه شکایت/نارضایتی داشته باشد،
  // PRODUCT_QUERY را ترجیح بده (محافظه‌کارانه).
  // این از false-positive escalation برای سوالات محصولی جلوگیری می‌کند.
  //
  // نسخه v2: کلمات Escalation سخت (شکایت، اپراتور، مدیر) را override نمی‌کند.
  // اگر کلمه Escalation سخت وجود داشته باشد، Ambiguity Gate رد می‌شود
  // تا اولویت‌های ORDER، PRICE_QUERY و ESCALATION تصمیم بگیرند.
  if (hasKeyword(text, PRODUCT_QUERY_KEYWORDS) || hasProductOrPriceContext(text)) {
    // تشخیص Escalation سخت: کلماتی که در ESCALATION_KEYWORDS هستند ولی نرم نیستند
    const hasHardEscalation = hasKeyword(text, ESCALATION_KEYWORDS) &&
      !hasKeyword(text, SOFT_ESCALATION_KEYWORDS);

    if (!hasHardEscalation) {
      const hasComplaintSignal = hasKeyword(text, SOFT_ESCALATION_KEYWORDS) ||
        hasKeyword(text, DISSATISFACTION_KEYWORDS) ||
        hasKeyword(text, REFUND_KEYWORDS);
      if (hasComplaintSignal) {
        const normalizedMsg = normalizeText(text);
        let productSubtype = 'GENERAL';
        if (PRODUCT_PRICE_SIGNALS.some(w => normalizedMsg.includes(w))) {
          productSubtype = 'PRICE';
        } else if (PRODUCT_AVAILABILITY_SIGNALS.some(w => normalizedMsg.includes(w))) {
          productSubtype = 'AVAILABILITY';
        }
        return { intent: 'PRODUCT_QUERY', subtype: productSubtype, matched_keyword: 'product_ambiguity_gate' };
      }
    }
  }
  // ===== END PRODUCT AMBIGUITY GATE =====

  // اولویت ۱: ORDER — قصد خرید (قبل از Escalation برای جلوگیری از false-positive)
  if (hasKeyword(text, ORDER_KEYWORDS)) {
    return { intent: 'ORDER', matched_keyword: ORDER_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۲: PRICE_QUERY — سوال قیمت عمومی (قبل از Escalation)
  if (hasKeyword(text, PRICE_QUERY_KEYWORDS)) {
    return { intent: 'PRICE_QUERY', matched_keyword: PRICE_QUERY_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۳: ESCALATION — درخواست اپراتور (با Gate نرم برای کلمات عمومی)
  if (hasKeyword(text, ESCALATION_KEYWORDS)) {
    const matchedKeyword = ESCALATION_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k)));

    // Gate: اگر کلمه Escalation نرم (پشتیبانی/کارشناس/مسئول) باشد
    // و پیام هم‌زمان زمینه محصول/قیمت داشته باشد،
    // از Escalation صرف‌نظر کن تا به PRODUCT_QUERY برسد
    if (hasKeyword(text, SOFT_ESCALATION_KEYWORDS) && hasProductOrPriceContext(text)) {
      console.log(`[IntentGate] Soft escalation "${matchedKeyword}" overridden by product/price context — falling through to product checks`);
      // Fall through — ESCALATION را برنگردان
    } else {
      return { intent: 'ESCALATION', matched_keyword: matchedKeyword };
    }
  }

  // اولویت ۴: DISSATISFACTION — ابراز نارضایتی
  if (hasKeyword(text, DISSATISFACTION_KEYWORDS)) {
    return { intent: 'DISSATISFACTION', matched_keyword: DISSATISFACTION_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۵: REFUND_REQUEST — درخواست بازگشت وجه
  if (hasKeyword(text, REFUND_KEYWORDS)) {
    return { intent: 'REFUND_REQUEST', matched_keyword: REFUND_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۶: EDUCATION — درخواست آموزش / راهنمای استفاده
  // بالاتر از HELP قرار دارد چون EDUCATION خاص‌تر است
  if (hasKeyword(text, EDUCATION_KEYWORDS)) {
    return { intent: 'EDUCATION', matched_keyword: EDUCATION_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۷: HELP — راهنما
  if (hasKeyword(text, HELP_KEYWORDS)) {
    return { intent: 'HELP', matched_keyword: HELP_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۸: BRAND_QUESTION — سوال درباره برند
  if (hasKeyword(text, BRAND_QUESTION_KEYWORDS)) {
    return { intent: 'BRAND_QUESTION', matched_keyword: BRAND_QUESTION_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۹: WARRANTY_QUERY — سوال درباره گارانتی
  if (hasKeyword(text, WARRANTY_KEYWORDS)) {
    return { intent: 'WARRANTY_QUERY', matched_keyword: WARRANTY_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۱۰: CONTACT — اطلاعات تماس
  if (hasKeyword(text, CONTACT_KEYWORDS)) {
    return { intent: 'CONTACT', matched_keyword: CONTACT_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۱۱: PRODUCT_QUERY — سوال مشخص درباره محصول
  if (hasKeyword(text, PRODUCT_QUERY_KEYWORDS)) {
    const normalizedMsg = normalizeText(text);
    let productSubtype = 'GENERAL';
    if (PRODUCT_PRICE_SIGNALS.some(w => normalizedMsg.includes(w))) {
      productSubtype = 'PRICE';
    } else if (PRODUCT_AVAILABILITY_SIGNALS.some(w => normalizedMsg.includes(w))) {
      productSubtype = 'AVAILABILITY';
    }
    return { intent: 'PRODUCT_QUERY', subtype: productSubtype, matched_keyword: PRODUCT_QUERY_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۱۲: GENERAL — سوال عمومی (بدون جستجوی محصول)
  if (hasKeyword(text, GENERAL_KEYWORDS)) {
    return { intent: 'GENERAL', matched_keyword: GENERAL_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // اولویت ۱۳: GREETING — فقط اگر هیچ intent دیگری تشخیص داده نشد
  if (hasKeyword(text, GREETING_KEYWORDS)) {
    return { intent: 'GREETING', matched_keyword: GREETING_KEYWORDS.find(k => normalizeText(text).includes(normalizeText(k))) };
  }

  // Default: FALLBACK — هیچ intent تشخیص داده نشد
  return { intent: 'FALLBACK' };
}

/**
 * دریافت پاسخ خودکار بر اساس Intent
 * @param {string} intent
 * @param {object} options - گزینه‌های اضافه (اختیاری)
 * @returns {string}
 */
function getAutoReply(intent, options = {}) {
  const SUPPORT = `پشتیبانی: ${SUPPORT_PHONE}
واحد فروش: ${SALES_PHONE}
وبسایت: ${WEBSITE}
اینستاگرام: ${INSTAGRAM}`;

  const REPLIES = {
    GREETING: `سلام؛
به سامانه پاسخگویی عقرب خوش آمدید.

هدف ما تأمین محصولات غذایی باکیفیت برای شما و کسب‌وکارهای همکار است.

برای مشاهده لیست خدمات، ورود به فروشگاه‌ها و راهنمای ثبت سفارش، لطفاً کلمه *«منو»* یا عدد ۰ را ارسال کنید.

با احترام،
شرکت آذرمهر صنعت

WWW.SCORPIONGROUP.IR`,

    HELP: `برای دریافت اطلاعات محصولات، نام محصول یا کد آن را ارسال کنید.

برای مشاهده قیمت و ثبت سفارش، لطفاً در پورتال عمده‌فروشی ثبت‌نام بفرمایید:

مثال:
"چای سیاه شکسته زرین فوق ممتاز عقرب ۶۶۶"
"چای سیاه باروتی زرین عقرب ۸۸۸"
"چای سیاه شکسته زرین عقرب"

برای اطلاع از قیمت‌ها، لطفاً در سامانه فروش عمده ثبت‌نام کنید:
${PORTAL_URL}

پشتیبانی: ${SUPPORT_PHONE}
وبسایت: ${WEBSITE}`,

    ORDER: `برای ثبت سفارش می‌توانید از طریق پورتال عمده‌فروشی اقدام فرمایید:
${PORTAL_URL}`,

    BRAND_QUESTION: `در حال جستجوی اطلاعات ... لطفاً صبر کنید.`,

    ESCALATION: `درخواست شما ثبت شد. کارشناسان پشتیبانی در ساعت اداری با شما تماس می‌گیرند.

${SUPPORT}`,

    PRODUCT_QUERY: `در حال بررسی محصول مورد نظر شما ...`,

    WARRANTY_QUERY: `محصولات گروه عقرب که روی بسته‌بندی آن‌ها عبارت «ضمانت بازگشت وجه» درج شده باشد، مشمول گارانتی بازگشت وجه هستند.

برای اطلاعات بیشتر درباره شرایط گارانتی با پشتیبانی تماس بگیرید:
${SUPPORT_PHONE}`,

    DISSATISFACTION: `از نارضایتی شما متأسفیم.
درخواست شما به کارشناسان پشتیبانی ارسال شد. در ساعت اداری با شما تماس می‌گیرند.

در صورت تمایل، کد محصول و شرح مشکل را ارسال کنید تا پیش از تماس اطلاعات بیشتری داشته باشیم.

پشتیبانی: ${SUPPORT_PHONE}`,

    REFUND_REQUEST: `درخواست بازگشت وجه شما ثبت شد.
لطفاً منتظر تماس کارشناسان پشتیبانی باشید.

در صورت تمایل، کد محصول و شماره سفارش را ارسال کنید تا پیش از تماس اطلاعات بیشتری داشته باشیم.

پشتیبانی: ${SUPPORT_PHONE}`,

    EDUCATION: `بخش آموزش

اگر برای استفاده از محصول یا روش مصرف راهنمایی نیاز دارید، لطفاً نام یا کد محصول مورد نظر را ارسال کنید تا راهنمای مناسب ارائه شود.

همچنین می‌توانید راهنمای دم‌آوری محصولات را در لینک زیر مشاهده کنید:
${BREW_GUIDE_URL}

پشتیبانی: ${SUPPORT_PHONE}`,

    GENERAL: `لطفاً نام محصول یا کد مورد نظر خود را ارسال کنید.`,

    FALLBACK: `متأسفم، متوجه سوالتون نشدم.
لطفاً نام محصول یا کد آن را ارسال کنید.

برای مشاهده قیمت و ثبت سفارش، لطفاً در پورتال عمده‌فروشی ثبت‌نام بفرمایید:

مثال:
"چای سیاه شکسته زرین فوق ممتاز عقرب ۶۶۶"
"چای سیاه باروتی زرین عقرب ۸۸۸"
"چای سیاه شکسته زرین عقرب"

در صورت نیاز به راهنمایی بیشتر با پشتیبانی تماس حاصل فرمایید:
${SUPPORT_PHONE}`,

    // ─── منوی شماره‌دار (Numbered Menu) ──────────────────────────────────
    WELCOME_FIRST: `🦂 به ربات پیام‌رسان چای آذرمهر صنعت (عقرب) خوش آمدید!

برای مشاهده منوی خدمات، کلمه «منو» را ارسال کنید.

یا اگر می‌خواهید مستقیم استعلام بگیرید، کافیست نام محصول یا کد آن را ارسال کنید.
مثال: "قیمت ۶۶۶" یا "چای باروتی"`,

    MENU: `🦂 آذرمهر صنعت (عقرب) — منوی خدمات

۱. خرید عمده
۲. خرید خرده
۳. پیگیری سفارشات
۴. گارانتی و خدمات پس از فروش
۵. راهنمای محصولات
۶. ارتباط با کارشناس پشتیبانی
۷. راهنمای خرید

لطفاً عدد گزینه مورد نظر را ارسال کنید.
برای بازگشت به این منو در هر زمان، عدد ۰ را ارسال کنید.
برای ارتباط مستقیم با پشتیبانی انسانی، عدد ۹ را ارسال کنید.`,

    MENU_WHOLESALE: `📦 خرید عمده

مسیر همکاری و خرید برای فروشگاه‌ها، بنکداران و شرکت‌ها.
کدهای محصولات عمده: ۵۵۵، ۶۶۶، ۷۷۷، ۸۸۸، ۵۰۵

قیمت‌ها در واتس‌اپ درج نمی‌شود. برای مشاهده قیمت و ثبت سفارش، به پورتال عمده مراجعه کنید:
${PORTAL_URL}

برای بازگشت به منو، عدد ۰ را ارسال کنید.`,

    MENU_RETAIL: `🛍️ خرید خرده

برای مصرف خانگی می‌توانید سفارش خود را مستقیم همینجا ثبت کنید.
لطفاً نام محصول + تعداد + آدرس را ارسال کنید.

مشاهده محصولات و فروشگاه آنلاین:
${RETAIL_URL}

برای بازگشت به منو، عدد ۰ را ارسال کنید.`,

    MENU_TRACKING: `📦 پیگیری سفارشات

لطفاً شماره سفارش یا شماره موبایل ثبت‌شده خود را ارسال کنید تا کارشناسان وضعیت مرسوله شما را بررسی و اعلام کنند.

برای بازگشت به منو، عدد ۰ را ارسال کنید.`,

    MENU_PRODUCT_GUIDE: `📖 راهنمای محصولات

برای آموزش دم‌آوری انواع چای (شکسته، باروتی، کیسه‌ای) و معرفی ویژگی‌های هرکدام، به لینک زیر مراجعه کنید:
${BREW_GUIDE_URL}

برای بازگشت به منو، عدد ۰ را ارسال کنید.`,

    MENU_PURCHASE_GUIDE: `👈 راهنمای خرید

برای انتخاب بهترین محصول و ثبت سفارش، این مراحل را دنبال کنید:

۱) انتخاب محصول
اگر نمی‌دانید کدام محصول مناسب شماست، نیاز خود را توضیح دهید تا بر اساس نوع مصرف و سلیقه شما راهنمایی کنیم.

۲) ثبت سفارش
• خرید خرده: نام محصول + تعداد + آدرس را در چت ارسال کنید
• خرید عمده: از طریق پورتال رسمی همکاری اقدام کنید

۳) تفاوت خرید عمده و خرده
• عمده: حداقل ۱۰ کیلوگرم، قیمت در پورتال، مخصوص فروشگاه‌ها و بنکداران
• خرده: از ۱۰۰ گرم تا ۹۰۰ گرم، سفارش در چت، مخصوص مصرف خانگی

۴) تایید و ارسال
پس از ثبت اطلاعات، تیم فروش سفارش را بررسی و فاکتور نهایی را ارسال می‌کند.

برای بازگشت به منو، عدد ۰ را ارسال کنید.`,

    MENU_CATALOG: `📖 *کاتالوگ محصولات اسکورپیون*

برای مشاهده لیست محصولات و دسته‌بندی‌ها می‌توانید از پورتال‌های رسمی ما استفاده کنید:

🛒 بخش خرده فروشی:
https://scorpiongroup.ir

🏢 بخش عمده فروشی:
https://wholesale-portal-azure.vercel.app

📍 جهت بازگشت به منوی اصلی عدد 0 را ارسال کنید.`,
  };

  return REPLIES[intent] || REPLIES.FALLBACK;
}

// ═══════════════════════════════════════════════════════════════════════════
// Simplified Portal Flow — WhatsApp as Acquisition Channel Only
// ═══════════════════════════════════════════════════════════════════════════
// وقتی USE_SIMPLIFIED_FLOW فعال است، واتساپ فقط:
// ۱) خوش‌آمدگویی می‌کند
// ۲) نوع مشتری را می‌پرسد
// ۳) لینک مناسب به پورتال می‌دهد
// ۴) در غیر این صورت fallback نشان می‌دهد

const WELCOME_SIMPLE = `سلام 👋
به سامانه سفارش اسکورپیون خوش آمدید.
لطفاً نوع خرید خود را انتخاب کنید:

۱) خرید خرده
۲) خرید عمده`;

const RETAIL_REPLY = `برای خرید خرده، لطفاً از طریق لینک زیر وارد پورتال شوید و در صفحه اول گزینه «خرده‌فروش» را انتخاب کنید:
${PORTAL_URL}

☎️ پشتیبانی: ${SUPPORT_PHONE}`;

const WHOLESALE_REPLY = `برای خرید عمده، لطفاً از طریق لینک زیر وارد پورتال شوید و در صفحه اول گزینه «عمده‌فروش» را انتخاب کنید:
${PORTAL_URL}

☎️ پشتیبانی: ${SUPPORT_PHONE}`;

const FALLBACK_SIMPLE = `لطفاً یکی از گزینه‌های زیر را ارسال کنید:

۱) خرید خرده
۲) خرید عمده`;

const RETAIL_KEYWORDS_SIMPLE = ['1', '۱', 'خرده', 'خرید خرده', 'خرده فروشی', 'خرده‌فروشی'];
const WHOLESALE_KEYWORDS_SIMPLE = ['2', '۲', 'عمده', 'خرید عمده', 'عمده فروشی', 'عمده‌فروشی'];

/**
 * تشخیص ورودی کاربر در حالت simplified portal flow
 * فقط: GREETING | RETAIL_CHOICE | WHOLESALE_CHOICE | FALLBACK
 * اولویت با انتخاب خرده/عمده است (حتی اگر همزمان سلام هم گفته باشد)
 */
function detectSimpleIntent(message) {
  if (!message) return { intent: 'FALLBACK' };
  const n = normalizeText(message);

  // تشخیص انتخاب خرده (اولویت بالا)
  const isRetail = RETAIL_KEYWORDS_SIMPLE.some(k => n.includes(normalizeText(k)));
  const isWholesale = WHOLESALE_KEYWORDS_SIMPLE.some(k => n.includes(normalizeText(k)));

  if (isRetail && !isWholesale) return { intent: 'RETAIL_CHOICE' };
  if (isWholesale && !isRetail) return { intent: 'WHOLESALE_CHOICE' };
  if (isRetail && isWholesale) return { intent: 'FALLBACK' }; // ambiguous

  // تشخیص سلام (فقط اگر انتخاب نکرده باشد)
  const greetingMatch = GREETING_KEYWORDS.some(k => {
    const nk = normalizeText(k);
    return n === nk || n.startsWith(nk + ' ');
  });
  if (greetingMatch) return { intent: 'GREETING' };

  return { intent: 'FALLBACK' };
}

module.exports = {
  detectIntent,
  getAutoReply,
  hasKeyword,
  normalizeText,
  hasProductOrPriceContext,
  // کلمات کلیدی (برای مصرف خارجی در تست و Debug)
  SOFT_ESCALATION_KEYWORDS,
  PRODUCT_CONTEXT_KEYWORDS,
  PRODUCT_QUERY_KEYWORDS,
  PRICE_QUERY_KEYWORDS,
  ORDER_KEYWORDS,
  ESCALATION_KEYWORDS,
  EDUCATION_KEYWORDS,
  // اطلاعات تماس
  SUPPORT_PHONE,
  SALES_PHONE,
  OFFICE_PHONE,
  WEBSITE,
  INSTAGRAM,
  PORTAL_URL,
  RETAIL_URL,
  BREW_GUIDE_URL,
  // Simplified Portal Flow
  detectSimpleIntent,
  WELCOME_SIMPLE,
  RETAIL_REPLY,
  WHOLESALE_REPLY,
  FALLBACK_SIMPLE,
};
