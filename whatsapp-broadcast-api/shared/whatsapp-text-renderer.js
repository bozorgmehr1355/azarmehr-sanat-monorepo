/**
 * ╪▒┘å╪»╪▒╪▒ ╪º╪«╪¬╪╡╪º╪╡█î ┘à╪¬┘å█î ╪¿╪▒╪º█î WhatsApp (Text-First Renderer)
 * =======================================================
 *
 * ╪╖╪¿┘é ┘à╪¡╪»┘ê╪»█î╪¬ D02 (╪«╪▒┘ê╪¼█î UltraMsg = text-only ╪»╪▒ ┘à╪│█î╪▒ ┘ü╪╣┘ä█î)╪î
 * ╪º█î┘å ┘à╪º┌ÿ┘ê┘ä Response Model ╪▒╪º ╪¿┘ç █î┌⌐ ┘à╪¬┘å ╪│╪º╪»┘ç ┘ê ╪«┘ê╪º┘å╪º ╪¬╪¿╪»█î┘ä ┘à█îΓÇî┌⌐┘å╪».
 *
 * ╪¿┘ä┘ê┌⌐ΓÇî┘ç╪º█î ┘╛╪┤╪¬█î╪¿╪º┘å█îΓÇî╪┤╪»┘ç:
 *   text, menu/buttons, product_list, product_card,
 *   image_card, handoff, tracking_request
 */

/**
 * @param {Object|string} response  ΓÇö Response Model █î╪º string ┘é╪»█î┘à█î
 * @returns {string} ┘à╪¬┘å ┘å┘ç╪º█î█î ╪¿╪▒╪º█î ╪º╪▒╪│╪º┘ä ╪»╪▒ WhatsApp
 */
function renderWhatsAppText(response) {
  if (!response) return '';

  // ΓöÇΓöÇ ┘╛╪┤╪¬█î╪¿╪º┘å█î ╪º╪▓ ╪«╪▒┘ê╪¼█îΓÇî┘ç╪º█î ┘é╪»█î┘à█î (string) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (typeof response === 'string') {
    return response.trim();
  }

  const parts = [];

  const pushText = (t) => {
    if (t && String(t).trim()) {
      parts.push(String(t).trim());
    }
  };

  // ΓöÇΓöÇ █▒. ┘à╪¬┘å ╪º╪╡┘ä█î ┘╛╪º╪│╪« ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (response.text) {
    pushText(response.text);
  }

  // ΓöÇΓöÇ █▓. ┘╛╪▒╪»╪º╪▓╪┤ ╪¿┘ä┘ê┌⌐ΓÇî┘ç╪º ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  for (const block of response.blocks || []) {
    if (!block || !block.type) continue;

    switch (block.type) {
      case 'text':
        pushText(block.text);
        break;

      case 'menu':
      case 'buttons':
        if (block.title) {
          pushText(`≡ƒôî ${block.title}`);
        }
        if (Array.isArray(block.items)) {
          const lines = block.items.map((item, idx) => {
            const label = item?.label || item?.text || `┌»╪▓█î┘å┘ç ${idx + 1}`;
            return `${idx + 1}. ${label}`;
          });
          pushText(lines.join('\n'));
        }
        break;

      case 'product_list':
        if (block.title) {
          pushText(`≡ƒôª ${block.title}`);
        }
        if (Array.isArray(block.items)) {
          const lines = block.items.map((item, idx) => {
            const name = item?.name || item?.title || `┘à╪¡╪╡┘ê┘ä ${idx + 1}`;
            const price = item?.price ? ` - ┘é█î┘à╪¬: ${item.price}` : '';
            return `${idx + 1}∩╕ÅΓâú ${name}${price}`;
          });
          pushText(lines.join('\n'));
        }
        break;

      case 'product_card':
        {
          const cardDetails = [];
          if (block.title) cardDetails.push(`≡ƒ¢ì∩╕Å *${block.title}*`);
          if (block.subtitle) cardDetails.push(block.subtitle);
          if (block.price) cardDetails.push(`≡ƒÆ░ ┘é█î┘à╪¬: ${block.price}`);
          if (block.url) cardDetails.push(`≡ƒöù ┘à╪┤╪º┘ç╪»┘ç ┘ê ╪«╪▒█î╪»: ${block.url}`);
          pushText(cardDetails.join('\n'));
        }
        break;

      case 'image_card':
        {
          const imageDetails = [];
          if (block.caption) imageDetails.push(block.caption);
          if (block.alt && !block.caption) imageDetails.push(`≡ƒû╝∩╕Å ${block.alt}`);
          if (block.url) imageDetails.push(`≡ƒöù ┘ä█î┘å┌⌐ ╪¬╪╡┘ê█î╪▒: ${block.url}`);
          pushText(imageDetails.join('\n'));
        }
        break;

      case 'handoff':
        pushText(
          `≡ƒñ¥ ${block.text || '╪»╪▒ ╪¡╪º┘ä ╪º┘å╪¬┘é╪º┘ä ╪┤┘à╪º ╪¿┘ç ╪º┘╛╪▒╪º╪¬┘ê╪▒ ╪¿╪«╪┤ ┘à╪▒╪¿┘ê╪╖┘ç... ┘ä╪╖┘ü╪º ╪┤┌⌐█î╪¿╪º ╪¿╪º╪┤█î╪».'}`
        );
        break;

      case 'tracking_request':
        pushText(
          `≡ƒöì ${block.text || '┘ä╪╖┘ü╪º┘ï ╪┤┘à╪º╪▒┘ç ╪│┘ü╪º╪▒╪┤ █î╪º ┌⌐╪» ┘╛█î┌»█î╪▒█î ╪«┘ê╪» ╪▒╪º ╪º╪▒╪│╪º┘ä ┌⌐┘å█î╪» ╪¬╪º ┘ê╪╢╪╣█î╪¬ ╪ó┘å ╪¿╪▒╪▒╪│█î ╪┤┘ê╪».'}`
        );
        break;

      default:
        // ╪¿┘ä┘ê┌⌐ΓÇî┘ç╪º█î ┘å╪º╪┤┘å╪º╪«╪¬┘ç ΓÇö ┘å╪º╪»█î╪»┘ç ┌»╪▒┘ü╪¬┘ç ┘à█îΓÇî╪┤┘ê┘å╪»
        break;
    }
  }

  // ΓöÇΓöÇ █│. Suggested Actions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (Array.isArray(response.suggestedActions) && response.suggestedActions.length > 0) {
    const actionLines = response.suggestedActions.map((action, idx) => {
      const label = action.label || action.value || `╪º┘å╪¬╪«╪º╪¿ ${idx + 1}`;
      return `≡ƒö╣ ╪¿╪▒╪º█î "${label}" ╪╣╪»╪» ${idx + 1} ╪▒╪º ╪º╪▒╪│╪º┘ä ┌⌐┘å█î╪».`;
    });
    pushText('\n≡ƒæç ┌»╪▓█î┘å┘çΓÇî┘ç╪º█î ┘╛█î╪┤┘å┘ç╪º╪»█î:\n' + actionLines.join('\n'));
  }

  return parts.join('\n\n').trim();
}

module.exports = { renderWhatsAppText };
