/**
 * Product Detection Engine Integration ΓÇö Agent v1.5
 * ==================================================
 * ┘ä╪º█î┘ç ╪¬╪┤╪«█î╪╡ ┘à╪¡╪╡┘ê┘ä ╪¿╪º ╪º┘à╪¬█î╪º╪▓╪»┘ç█î ╪│█î┌»┘å╪º┘ä█î (╪¿╪▒ ╪º╪│╪º╪│ product_signals)
 *
 * ┘à╪╣┘à╪º╪▒█î:
 *   █▒. ╪¬┘ä╪º╪┤ ╪¿╪▒╪º█î ╪º╪│┌⌐┘ê╪▒█î┘å┌» ╪º╪▓ product_signals
 *   █▓. ╪º┌»╪▒ ╪º╪╣╪¬┘à╪º╪» ΓëÑ █╖█░ ΓåÆ ╪º╪│╪¬┘ü╪º╪»┘ç ┘à╪│╪¬┘é█î┘à
 *   █│. ╪º┌»╪▒ █╡█░ Γëñ ╪º╪╣╪¬┘à╪º╪» < █╖█░ ΓåÆ ┘╛█î╪┤┘å┘ç╪º╪» ╪¿┘ç ┌⌐╪º╪▒╪¿╪▒ (┘å█î╪º╪▓ ╪¿┘ç ╪¬╪ú█î█î╪»)
 *   █┤. ╪º┌»╪▒ ╪º╪╣╪¬┘à╪º╪» < █╡█░ ΓåÆ fallback ╪¿┘ç ILIKE ╪¼╪│╪¬╪¼┘ê█î ┘ü╪╣┘ä█î
 *   █╡. ╪º┌»╪▒ product_signals ┘ê╪¼┘ê╪» ┘å╪»╪º╪┤╪¬┘ç ╪¿╪º╪┤╪» ΓåÆ skip (no error)
 */

'use strict';

const { supabase } = require('./_lib');

// ============================================================================
// █▒. ┘å╪▒┘à╪º┘äΓÇî╪│╪º╪▓█î ┘à╪¬┘å (┌⌐┘╛█î ╪º╪▓ product-detection-engine.js)
// ============================================================================

function normalizeText(text) {
  if (!text) return '';
  let s = String(text);
  // فارسی (۰-۹) → انگلیسی (0-9)
  s = s.replace(/[۰-۹]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 1776 + 48));
  // عربی (٠-٩) → انگلیسی (0-9)
  s = s.replace(/[٠-٩]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 1632 + 48));
  // یکسان‌سازی حروف
  s = s.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  s = s.replace(/آ/g, 'ا').replace(/ۀ/g, 'ه').replace(/ة/g, 'ه');
  // ╪¡╪░┘ü ZWNJ
  s = s.replace(/\u200C/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ============================================================================
// █▓. ╪º╪│╪¬╪«╪▒╪º╪¼ ╪│█î┌»┘å╪º┘äΓÇî┘ç╪º ╪º╪▓ ┘à╪¬┘å
// ============================================================================

function extractSignals(normalizedText) {
  const tokens = normalizedText.split(/\s+/).filter(Boolean);
  const threeDigitCodes = tokens.filter((t) => /^\d{3}$/.test(t));
  const weights = tokens.filter((t) => /^\d+$/.test(t) && parseInt(t, 10) > 0);
  return { tokens, threeDigitCodes, weights };
}

// ============================================================================
// █│. ╪º┘à╪¬█î╪º╪▓╪»┘ç█î ┘à╪¡╪╡┘ê┘ä╪º╪¬
// ============================================================================

async function scoreProducts(normalizedText, tokens) {
  // ┘ê╪º┌⌐╪┤█î ┘ç┘à┘ç ╪│█î┌»┘å╪º┘äΓÇî┘ç╪º█î ┘ü╪╣╪º┘ä
  const { data: signals, error } = await supabase
    .from('product_signals')
    .select('product_id, signal_type, signal_value, normalized_value, weight')
    .eq('is_active', true);

  if (error) {
    // ╪¼╪»┘ê┘ä product_signals ┘ê╪¼┘ê╪» ┘å╪»╪º╪▒╪» ΓåÉ ╪º█î┘å ┘é╪º╪¿┘ä█î╪¬ ╪║█î╪▒┘ü╪╣╪º┘ä ╪º╪│╪¬
    return { scores: new Map(), foundSignals: [], tableMissing: true };
  }

  if (!signals || signals.length === 0) {
    return { scores: new Map(), foundSignals: [], tableMissing: false };
  }

  const scores = new Map();
  const foundSignals = [];

  for (const signal of signals) {
    const nv = signal.normalized_value;
    if (!nv) continue;

    let matched = false;

    if (signal.signal_type === 'alias_exact') {
      if (normalizedText.includes(nv)) matched = true;
    } else {
      for (const token of tokens) {
        if (token === nv) { matched = true; break; }
      }
    }

    if (matched) {
      const current = scores.get(signal.product_id) || 0;
      scores.set(signal.product_id, current + signal.weight);
      foundSignals.push({
        product_id: signal.product_id,
        signal_type: signal.signal_type,
        signal_value: signal.signal_value,
        normalized_value: nv,
        weight: signal.weight,
      });
    }
  }

  return { scores, foundSignals, tableMissing: false };
}

// ============================================================================
// █┤. ╪¬╪╡┘à█î┘àΓÇî┌»█î╪▒█î
// ============================================================================

function decide(scores) {
  if (scores.size === 0) {
    return { matchedProductIds: [], confidence: 0, needsClarification: false };
  }

  const sorted = [...scores.entries()]
    .map(([product_id, score]) => ({ product_id, score }))
    .sort((a, b) => b.score - a.score);

  const topScore = sorted[0].score;

  // Match ┘é╪╖╪╣█î (ΓëÑ █╖█░)
  if (topScore >= 70) {
    const tooClose = sorted.length > 1 && topScore - sorted[1].score < 15;
    return {
      matchedProductIds: tooClose ? sorted.map(s => s.product_id) : [sorted[0].product_id],
      confidence: Math.min(topScore, 100),
      needsClarification: tooClose,
    };
  }

  // ┘à╪¿┘ç┘à (ΓëÑ █╡█░)
  if (topScore >= 50) {
    return {
      matchedProductIds: sorted.map(s => s.product_id),
      confidence: topScore,
      needsClarification: true,
    };
  }

  // ╪╣╪»┘à ╪¬╪╖╪º╪¿┘é (< █╡█░)
  return {
    matchedProductIds: [],
    confidence: topScore,
    needsClarification: false,
  };
}

// ============================================================================
// █╡. ┘ê╪º┌⌐╪┤█î ╪º╪╖┘ä╪º╪╣╪º╪¬ ┌⌐╪º┘à┘ä ┘à╪¡╪╡┘ê┘ä╪º╪¬ ╪º╪▓ ╪»█î╪¬╪º╪¿█î╪│
// ============================================================================

async function fetchProductsByIds(productIds) {
  if (!productIds || productIds.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .in('id', productIds);

  if (error || !data) return [];
  return data;
}

// ============================================================================
// █╢. ╪¬╪º╪¿╪╣ ╪º╪╡┘ä█î (exported)
// ============================================================================

/**
 * ╪¬╪┤╪«█î╪╡ ┘ê ╪¼╪│╪¬╪¼┘ê█î ┘à╪¡╪╡┘ê┘ä ╪¿╪º ╪º╪│╪¬┘ü╪º╪»┘ç ╪º╪▓ ┘à┘ê╪¬┘ê╪▒ ╪│█î┌»┘å╪º┘ä█î + ILIKE fallback
 *
 * @param {string} searchText - ┘à╪¬┘å ╪¼╪│╪¬╪¼┘ê█î ┌⌐╪º╪▒╪¿╪▒
 * @returns {Promise<{products: array, method: string, confidence: number, debug?: object}>}
 *
 * ┘à╪¬╪»┘ç╪º:
 *   - signal_exact   ΓåÆ ╪¬╪╖╪º╪¿┘é ╪│█î┌»┘å╪º┘ä█î ╪¿╪º confidence ΓëÑ █╖█░ (╪»┘é█î┘é)
 *   - signal_ambiguous ΓåÆ ╪¬╪╖╪º╪¿┘é ╪│█î┌»┘å╪º┘ä█î ╪¿╪º confidence ΓëÑ █╡█░ (┘à╪¿┘ç┘à)
 *   - ilike          ΓåÆ fallback ╪¿┘ç ILIKE ╪¼╪│╪¬╪¼┘ê (┘à┘ê╪¼┘ê╪»)
 *   - none           ΓåÆ ┘ç█î┌å ┘à╪¡╪╡┘ê┘ä█î █î╪º┘ü╪¬ ┘å╪┤╪»
 */
async function detectAndSearchProducts(searchText) {
  if (!searchText || searchText.trim().length < 2) {
    return { products: [], method: 'none', confidence: 0 };
  }

  // ΓöÇΓöÇ ┘à╪▒╪¡┘ä┘ç █▒: ╪¬╪┤╪«█î╪╡ ╪│█î┌»┘å╪º┘ä█î ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const normalizedText = normalizeText(searchText);
  const { tokens } = extractSignals(normalizedText);

  const { scores, foundSignals, tableMissing } = await scoreProducts(normalizedText, tokens);

  // ╪º┌»╪▒ ╪¼╪»┘ê┘ä product_signals ┘à┘ê╪¼┘ê╪» ┘å╪¿╪º╪┤╪»╪î ┘à╪│╪¬┘é█î┘à ╪¿╪▒┘ê ╪¿┘ç ILIKE
  if (tableMissing) {
    // ┘ü┘é╪╖ fallback
    return { products: [], method: 'table_missing', confidence: 0, _skipToIlike: true };
  }

  if (scores.size > 0) {
    const decision = decide(scores);

    if (decision.confidence >= 70 && !decision.needsClarification) {
      // Match ┘é╪╖╪╣█î!
      const fullProducts = await fetchProductsByIds(decision.matchedProductIds);
      if (fullProducts.length > 0) {
        return {
          products: fullProducts,
          method: 'signal_exact',
          confidence: decision.confidence,
          debug: { found_signals: foundSignals, matched_ids: decision.matchedProductIds },
        };
      }
    }

    if (decision.confidence >= 50) {
      // Match ┘à╪¿┘ç┘à ΓÇö ╪¿╪▒┌»╪▒╪»╪º┘å ╪¿╪º flag
      const fullProducts = await fetchProductsByIds(decision.matchedProductIds);
      if (fullProducts.length > 0) {
        return {
          products: fullProducts,
          method: 'signal_ambiguous',
          confidence: decision.confidence,
          needsClarification: true,
          debug: { found_signals: foundSignals, matched_ids: decision.matchedProductIds },
        };
      }
    }
  }

  // ΓöÇΓöÇ ┘à╪▒╪¡┘ä┘ç █▓: Fallback ΓÇö ┘ç█î┌å ┘å╪¬█î╪¼┘çΓÇî╪º█î ╪º╪▓ ╪│█î┌»┘å╪º┘äΓÇî┘ç╪º ┘å╪»╪º╪┤╪¬█î┘à
  return { products: [], method: 'no_signal_match', confidence: 0, _skipToIlike: true };
}

module.exports = {
  detectAndSearchProducts,
  normalizeText,
  extractSignals,
  scoreProducts,
  decide,
};
