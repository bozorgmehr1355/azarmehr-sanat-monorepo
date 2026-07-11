/**
 * ╪│╪º╪«╪¬╪º╪▒ ╪º╪│╪¬╪º┘å╪»╪º╪▒╪» ┘╛╪º╪│╪« ┘à╪┤╪¬╪▒┌⌐ ┘╛╪▒┘ê┌ÿ┘ç (Channel-Agnostic Response Model)
 * ==================================================================
 *
 * ╪╖╪¿┘é ╪¬╪╡┘à█î┘à ┘à╪╣┘à╪º╪▒█î D02 ┘ê D03:
 *   - Business logic ╪º╪▓ ┌⌐╪º┘å╪º┘ä ╪«╪▒┘ê╪¼█î ┘à╪│╪¬┘é┘ä ┘à█îΓÇî╪┤┘ê╪»
 *   - ┘ç╪▒ Renderer (WhatsApp Text, Bale Rich, Website) ╪º█î┘å ┘à╪»┘ä ╪▒╪º ╪¿┘ç ┘ü╪▒┘à╪¬
 *     ┘à╪«╪¬╪╡ ╪«┘ê╪» ╪¬╪¿╪»█î┘ä ┘à█îΓÇî┌⌐┘å╪»
 *   - ╪ó╪»╪º┘╛╪¬┘ê╪▒ backward compatibility (adapters/response-adapter.js)
 *     ╪«╪▒┘ê╪¼█îΓÇî┘ç╪º█î ┘é╪»█î┘à█î (string) ╪▒╪º ╪¿┘ç ╪º█î┘å ┘à╪»┘ä ╪¬╪¿╪»█î┘ä ┘à█îΓÇî┌⌐┘å╪»
 *
 * ╪│╪º╪«╪¬╪º╪▒:
 *   intent:            string     ΓÇö ╪┤┘å╪º╪│┘ç intent (┘à╪½┘ä╪º┘ï GREETING, ORDER, PRODUCT_QUERY)
 *   channel:           string     ΓÇö ┌⌐╪º┘å╪º┘ä ┘à┘é╪╡╪» (whatsapp, bale, website, ...)
 *   text:              string     ΓÇö ┘à╪¬┘å ╪º╪╡┘ä█î ┘ê ╪│╪º╪»┘ç ┘╛╪º╪│╪«
 *   blocks:            array      ΓÇö ╪ó╪▒╪º█î┘çΓÇî╪º█î ╪º╪▓ ╪¿┘ä┘ê┌⌐ΓÇî┘ç╪º█î ╪│╪º╪«╪¬█î╪º┘ü╪¬┘ç (┘à┘å┘ê╪î ┘à╪¡╪╡┘ê┘ä╪î ╪»╪│╪¬█î╪º╪▒╪î ...)
 *   metadata:          object     ΓÇö ╪º╪¿╪▒╪»╪º╪»┘ç (┘å┘ê╪╣ ┘à╪┤╪¬╪▒█î╪î need human, ┘à┘å╪¿╪╣ intent, ...)
 *   suggestedActions:  array      ΓÇö ╪º┘é╪»╪º┘à╪º╪¬ ┘╛█î╪┤┘å┘ç╪º╪»█î ╪¿╪▒╪º█î ┌⌐╪º╪▒╪¿╪▒
 *   stateTransition:   any|null   ΓÇö ╪¬╪║█î█î╪▒ ┘ê╪╢╪╣█î╪¬ ┘à┌⌐╪º┘ä┘à┘ç (╪»╪▒ ╪╡┘ê╪▒╪¬ ┘å█î╪º╪▓)
 *   timestamp:         string     ΓÇö ISO timestamp ╪º█î╪¼╪º╪» ┘╛╪º╪│╪«
 */

/**
 * @param {Object} params
 * @param {string} [params.intent='UNKNOWN']
 * @param {string} [params.channel='whatsapp']
 * @param {string} [params.text='']
 * @param {Array}  [params.blocks=[]]
 * @param {Object} [params.metadata={}]
 * @param {Array}  [params.suggestedActions=[]]
 * @param {*}      [params.stateTransition=null]
 * @returns {Object} responseModel
 */
function createResponse({
  intent = 'UNKNOWN',
  channel = 'whatsapp',
  text = '',
  blocks = [],
  metadata = {},
  suggestedActions = [],
  stateTransition = null,
} = {}) {
  return {
    intent,
    channel,
    text,
    blocks: Array.isArray(blocks) ? blocks : [],
    metadata: {
      customer_type: metadata.customer_type || 'unknown',
      needs_human: !!metadata.needs_human,
      source: metadata.source || 'intent-engine',
      ...metadata,
    },
    suggestedActions: Array.isArray(suggestedActions) ? suggestedActions : [],
    stateTransition,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { createResponse };
