/**
 * ╪ó╪»╪º┘╛╪¬┘ê╪▒ ╪│╪º╪▓┌»╪º╪▒█î ╪¿╪º ╪│█î╪│╪¬┘àΓÇî┘ç╪º█î ┘é╪»█î┘à█î (Backward Compatibility Adapter)
 * ===================================================================
 *
 * ╪º█î┘å ┘à╪º┌ÿ┘ê┘ä ╪«╪▒┘ê╪¼█îΓÇî┘ç╪º█î ┘é╪»█î┘à█î (string) ╪▒╪º ╪¿┘ç Response Model ╪º╪│╪¬╪º┘å╪»╪º╪▒╪»
 * ╪¬╪¿╪»█î┘ä ┘à█îΓÇî┌⌐┘å╪»╪î ╪¬╪º Renderer┘ç╪º ┘ç┘à█î╪┤┘ç ┘ê╪▒┘ê╪»█î █î┌⌐┘╛╪º╪▒┌å┘ç ╪»╪▒█î╪º┘ü╪¬ ┌⌐┘å┘å╪».
 *
 * ╪│┘å╪º╪▒█î┘ê┘ç╪º█î ┘╛╪┤╪¬█î╪¿╪º┘å█îΓÇî╪┤╪»┘ç:
 *   - ╪«╪▒┘ê╪¼█î string ΓåÆ createResponse ╪¿╪º intent ┘╛█î╪┤ΓÇî┘ü╪▒╪╢
 *   - ╪«╪▒┘ê╪¼█î object ╪¿╪º intent █î╪º blocks ΓåÆ ╪¿╪»┘ê┘å ╪¬╪║█î█î╪▒ ╪╣╪¿┘ê╪▒ ╪»╪º╪»┘ç ┘à█îΓÇî╪┤┘ê╪»
 *   - null/undefined ΓåÆ createResponse ╪¿╪º intent=EMPTY
 *   - ╪│╪º█î╪▒ ┘à┘ê╪º╪▒╪» ΓåÆ createResponse ╪¿╪º intent=UNKNOWN_FORMAT
 */

const { createResponse } = require('./response-model');

/**
 * @param {*} rawOutput  ΓÇö ╪«╪▒┘ê╪¼█î ╪«╪º┘à ╪º╪▓ business logic (string | object | null)
 * @param {string} [fallbackIntent='CONVERSATION']  ΓÇö intent ┘╛█î╪┤ΓÇî┘ü╪▒╪╢ ╪¿╪▒╪º█î string
 * @returns {Object} Response Model ┘à╪╣╪¬╪¿╪▒
 */
function ensureResponseModel(rawOutput, fallbackIntent = 'CONVERSATION') {
  // ΓöÇΓöÇ null / undefined ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (rawOutput == null) {
    return createResponse({ intent: 'EMPTY', text: '' });
  }

  // ΓöÇΓöÇ ╪º╪▓ ┘é╪¿┘ä Response Model ╪º╪│╪¬ ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (typeof rawOutput === 'object' && (rawOutput.intent || rawOutput.blocks)) {
    return rawOutput;
  }

  // ΓöÇΓöÇ ╪▒╪┤╪¬┘ç ╪│╪º╪»┘ç ΓåÆ ╪¬╪¿╪»█î┘ä ╪¿┘ç Response Model ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (typeof rawOutput === 'string') {
    return createResponse({
      intent: fallbackIntent,
      text: rawOutput,
      metadata: { source: 'compatibility-adapter' },
    });
  }

  // ΓöÇΓöÇ ┘ç╪▒ ┘å┘ê╪╣ ┘å╪º╪┤┘å╪º╪«╪¬┘ç ╪»█î┌»╪▒ ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  return createResponse({
    intent: 'UNKNOWN_FORMAT',
    text: String(rawOutput),
    metadata: { source: 'compatibility-adapter-fallback' },
  });
}

module.exports = { ensureResponseModel };
