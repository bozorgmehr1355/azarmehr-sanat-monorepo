/**
 * Q&A Match API — Intent Detection & Answer Retrieval
 * ====================================================
 * این endpoint متن سؤال کاربر را با keywordهای ذخیره‌شده در
 * جداول Q&A (qa_intents, qa_keywords, qa_answers) تطبیق می‌دهد
 * و intent مناسب را با confidence و answer مربوطه برمی‌گرداند.
 *
 * منطق کاملاً deterministic:
 *   - exact match با وزن ۲
 *   - partial match با وزن ۱
 *   - threshold حداقلی ۳۰٪
 *   - tie-break: confidence DESC → exact_matches DESC → intent_id ASC
 *   - fallback در صورت عدم تشخیص قطعی یا ابهام بین دو intent
 *
 * POST /api/qa-match
 * Body: { question: string }
 */

const { supabase, cors } = require('./_lib');

// ============================================================================
// Constants
// ============================================================================
const CONFIDENCE_THRESHOLD = 17;
const TIE_DISTANCE = 5;

const FALLBACK_MESSAGE =
  'متأسفم، متوجه سوالتون نشدم.\n' +
  'لطفاً سؤال خود را دقیق‌تر بپرسید.\n\n' +
  'برای راهنمایی بیشتر با پشتیبانی تماس بگیرید:\n' +
  '۰۹۳۸۵۵۵۵۶۸۶';

// ============================================================================
// 1. نرمال‌سازی متن فارسی (inline — بدون وابستگی خارجی)
// ============================================================================

function normalizeText(text) {
  if (!text) return '';
  let s = String(text);

  // فارسی (۰-۹) → انگلیسی (0-9)
  const persianZero = '۰'.charCodeAt(0);
  s = s.replace(/[۰-۹]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - persianZero + 48)
  );

  // عربی (٠-٩) → انگلیسی (0-9)
  const arabicZero = '٠'.charCodeAt(0);
  s = s.replace(/[٠-٩]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - arabicZero + 48)
  );

  // یکسان‌سازی حروف
  s = s.replace(/ي/g, 'ی');
  s = s.replace(/ك/g, 'ک');
  s = s.replace(/آ/g, 'ا');
  s = s.replace(/ۀ/g, 'ه');
  s = s.replace(/ة/g, 'ه');

  // حذف ZWNJ (فاصله مجازی)
  s = s.replace(/\u200C/g, ' ');

  // حذف فضاهای اضافی، trim، lowercase برای حروف انگلیسی
  s = s.replace(/\s+/g, ' ').trim().toLowerCase();

  return s;
}

// ============================================================================
// 2. منطق تطبیق (Matching Logic)
// ============================================================================

/**
 * تشخیص exact match:
 *   - اگر keyword چندکلمه‌ای است، شامل بودن در متن کافی است
 *   - اگر تک‌کلمه‌ای است: علائم نگارشی را با فاصله جایگزین،
 *     سپس به توکن تقسیم و بررسی می‌کند.
 *     NOTE: `\b` در JavaScript برای فارسی کار نمی‌کند
 *     (حروف فارسی جزو \w نیستند)، بنابراین از token-split استفاده می‌شود.
 */
function isExactMatch(normalizedText, normalizedKeyword) {
  if (!normalizedKeyword) return false;

  // عبارت چندکلمه‌ای → includes
  if (normalizedKeyword.includes(' ')) {
    return normalizedText.includes(normalizedKeyword);
  }

  // تک‌کلمه → token-split (برای پشتیبانی از حروف فارسی و انگلیسی)
  const cleaned = normalizedText.replace(
    /[،؛؟!.:\-\(\)\[\]{}"»«'']/g,
    ' '
  );
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.includes(normalizedKeyword);
}

/**
 * امتیازدهی یک intent بر اساس تطابق keywordهای آن با متن کاربر.
 *
 * @returns {{ score, exactMatches, partialMatches, confidence, matchedKeywords }}
 */
function scoreIntent(intent, keywords, normalizedText) {
  const intentKeywords = keywords.filter((k) => k.intent_id === intent.id);

  if (intentKeywords.length === 0) {
    return {
      score: 0,
      exactMatches: 0,
      partialMatches: 0,
      confidence: 0,
      matchedKeywords: [],
    };
  }

  let exactMatches = 0;
  let partialMatches = 0;
  const matchedKeywords = [];

  for (const kw of intentKeywords) {
    const normalizedKeyword = normalizeText(kw.keyword);
    if (!normalizedKeyword) continue;

    if (isExactMatch(normalizedText, normalizedKeyword)) {
      exactMatches++;
      matchedKeywords.push(kw.keyword);
    } else if (normalizedText.includes(normalizedKeyword)) {
      partialMatches++;
      matchedKeywords.push(kw.keyword);
    }
  }

  const totalWeight = exactMatches * 2 + partialMatches * 1;
  const maxPossible = intentKeywords.length * 2;
  const confidence =
    maxPossible > 0 ? Math.round((totalWeight / maxPossible) * 100) : 0;

  return {
    score: totalWeight,
    exactMatches,
    partialMatches,
    confidence,
    matchedKeywords,
  };
}

// ============================================================================
// 3. Handler اصلی
// ============================================================================

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'فقط POST مجاز است' });
  }

  try {
    const { question } = req.body || {};

    if (!question || !question.trim()) {
      return res.status(400).json({ ok: false, error: 'متن سؤال الزامی است' });
    }

    const normalizedQuestion = normalizeText(question);

    // ── 1. واکشی intentهای فعال ────────────────────────────────────
    const { data: intents, error: intentsErr } = await supabase
      .from('qa_intents')
      .select('id, intent_id, title')
      .eq('is_active', true);

    if (intentsErr) {
      console.error('[qa-match] Error fetching intents:', intentsErr.message);
      return res.status(500).json({ ok: false, error: 'خطا در خواندن intents' });
    }

    if (!intents || intents.length === 0) {
      return res.json({
        ok: true,
        intent: null,
        intent_title: null,
        confidence: 0,
        matched_keywords: [],
        answer: FALLBACK_MESSAGE,
      });
    }

    const intentIds = intents.map((i) => i.id);

    // ── 2. واکشی keywordها ─────────────────────────────────────────
    const { data: keywords, error: kwErr } = await supabase
      .from('qa_keywords')
      .select('intent_id, keyword')
      .in('intent_id', intentIds);

    if (kwErr) {
      console.error('[qa-match] Error fetching keywords:', kwErr.message);
      return res.status(500).json({ ok: false, error: 'خطا در خواندن keywords' });
    }

    // ── 3. واکشی answers عمومی ─────────────────────────────────────
    const { data: answers, error: ansErr } = await supabase
      .from('qa_answers')
      .select('intent_id, answer_text')
      .eq('is_active', true)
      .is('product_id', null)
      .in('intent_id', intentIds);

    if (ansErr) {
      console.error('[qa-match] Error fetching answers:', ansErr.message);
      return res.status(500).json({ ok: false, error: 'خطا در خواندن answers' });
    }

    // ── 4. ساخت Map برای answers ────────────────────────────────────
    const answerMap = {};
    if (answers) {
      for (const a of answers) {
        if (!answerMap[a.intent_id]) {
          answerMap[a.intent_id] = a.answer_text;
        }
      }
    }

    // ── 5. امتیازدهی هر intent ──────────────────────────────────────
    const scoredIntents = intents.map((intent) => {
      const result = scoreIntent(intent, keywords || [], normalizedQuestion);
      return { ...intent, ...result };
    });

    // مرتب‌سازی: confidence DESC → exactMatches DESC → id ASC
    scoredIntents.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (b.exactMatches !== a.exactMatches) return b.exactMatches - a.exactMatches;
      return a.id - b.id;
    });

    const best = scoredIntents[0];

    // ── 6. تصمیم‌گیری ──────────────────────────────────────────────
    if (best && best.confidence >= CONFIDENCE_THRESHOLD) {
      // بررسی ابهام: اگر فاصله با intent دوم کم است → fallback
      const second = scoredIntents[1];
      if (second && best.confidence - second.confidence < TIE_DISTANCE) {
        return res.json({
          ok: true,
          intent: null,
          intent_title: null,
          confidence: 0,
          matched_keywords: [],
          answer: FALLBACK_MESSAGE,
        });
      }

      // تشخیص قطعی
      return res.json({
        ok: true,
        intent: best.intent_id,
        intent_title: best.title,
        confidence: best.confidence,
        matched_keywords: best.matchedKeywords,
        answer: answerMap[best.id] || FALLBACK_MESSAGE,
      });
    }

    // عدم تشخیص → fallback
    return res.json({
      ok: true,
      intent: null,
      intent_title: null,
      confidence: 0,
      matched_keywords: [],
      answer: FALLBACK_MESSAGE,
    });
  } catch (e) {
    console.error('[qa-match] Unexpected error:', e.message);
    return res.status(500).json({
      ok: false,
      error: 'خطای داخلی سرور',
    });
  }
};
