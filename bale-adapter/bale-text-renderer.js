/**
 * Bale Rich-Text Renderer
 * =======================
 *
 * مطابق معماری D02/D03 این رندرر Response Model (channel-agnostic) را به
 * ساختار قابل ارسال در Bale Bot API تبدیل می‌کند.
 *
 * Bale از تلگرام Bot API پیروی می‌کند با تفاوت‌های جزئی:
 *   - پشتیبانی از `inline_keyboard` (دکمه‌های زیر پیام)
 *   - پشتیبانی از `parse_mode=Markdown` (فرمت‌دهی متن)
 *
 * بلوک‌های پشتیبانی‌شده:
 *   text, menu/buttons, product_list, product_card,
 *   image_card, handoff, tracking_request
 *
 * @see whatsapp-broadcast-api/shared/response-model.js
 */

'use strict';

/**
 * رندر Response Model به ساختار Bale Bot API
 *
 * @param {Object|string} response  — Response Model یا string قدیمی (backward compat)
 * @returns {Object} Bale API-ready:
 *   {
 *     text:        string,
 *     parse_mode:  'Markdown'|undefined,
 *     reply_markup:{ inline_keyboard: [[...]] } | undefined
 *   }
 */
function renderBaleMessage(response) {
  const result = {
    text: '',
    parse_mode: undefined,
    reply_markup: undefined,
  };

  // ── backward compatibility: string → متن ساده ──────────────
  if (!response) {
    result.text = '';
    return result;
  }
  if (typeof response === 'string') {
    result.text = response.trim();
    return result;
  }

  const textParts = [];
  const keyboardRows = [];

  const pushText = (t) => {
    if (t && String(t).trim()) {
      textParts.push(String(t).trim());
    }
  };

  const addButtonRow = (buttons) => {
    if (Array.isArray(buttons) && buttons.length > 0) {
      keyboardRows.push(buttons);
    }
  };

  // ── 1. متن اصلی پاسخ ──────────────────────────────────────
  if (response.text) {
    pushText(response.text);
  }

  // ── 2. پردازش بلوک‌ها ──────────────────────────────────────
  for (const block of response.blocks || []) {
    if (!block || !block.type) continue;

    switch (block.type) {
      case 'text':
        pushText(block.text);
        break;

      case 'menu':
      case 'buttons':
        if (block.title) {
          pushText(`📌 ${block.title}`);
        }
        if (Array.isArray(block.items)) {
          const row = block.items.map((item) => {
            const label = item?.label || item?.text || 'گزینه';
            const data = item?.value || item?.callback_data || item?.label || label;
            return { text: label, callback_data: data };
          });
          addButtonRow(row);
        }
        break;

      case 'product_list':
        if (block.title) {
          pushText(`📦 *${block.title}*`);
        }
        if (Array.isArray(block.items)) {
          const lines = block.items.map((item) => {
            const name = item?.name || item?.title || 'محصول';
            const price = item?.price ? ` — قیمت: ${item.price}` : '';
            return `🔹 ${name}${price}`;
          });
          pushText(lines.join('\n'));
          // اگر URL کلی وجود داشت، یک دکمه «مشاهده همه» اضافه کن
          if (block.url) {
            addButtonRow([
              { text: '🛒 مشاهده همه محصولات', url: block.url },
            ]);
          }
        }
        break;

      case 'product_card':
        {
          const cardLines = [];
          if (block.title) cardLines.push(`🛍️ *${block.title}*`);
          if (block.subtitle) cardLines.push(block.subtitle);
          if (block.price) cardLines.push(`💰 قیمت: ${block.price}`);
          if (block.description) cardLines.push(block.description);
          pushText(cardLines.join('\n'));

          // دکمه خرید / مشاهده
          const cardButtons = [];
          if (block.url) {
            cardButtons.push({ text: '🔗 مشاهده و خرید', url: block.url });
          }
          if (block.callback_data) {
            cardButtons.push({ text: block.callback_label || 'خرید', callback_data: block.callback_data });
          }
          if (cardButtons.length > 0) addButtonRow(cardButtons);
        }
        break;

      case 'image_card':
        {
          // Bale از تصویر درون‌خطی پشتیبانی می‌کند، اما Bale Bot API
          // تصویر را جداگانه ارسال می‌کند. اینجا فقط متن + لینک نمایش داده می‌شود.
          const imgLines = [];
          if (block.caption) imgLines.push(block.caption);
          if (block.alt && !block.caption) imgLines.push(`🖼️ ${block.alt}`);
          if (block.url) {
            imgLines.push(`🔗 لینک تصویر: ${block.url}`);
          }
          pushText(imgLines.join('\n'));

          // اگر image_url جدا از caption_url است، دکمه مجزا
          if (block.image_url) {
            addButtonRow([{ text: '🖼️ مشاهده تصویر', url: block.image_url }]);
          }
        }
        break;

      case 'handoff':
        pushText(
          `🤝 ${block.text || 'در حال انتقال شما به اپراتور بخش مربوطه... لطفاً شکیبا باشید.'}`
        );
        // اگر شماره یا لینکی برای انتقال سریع وجود دارد
        if (block.phone) {
          addButtonRow([{ text: '📞 تماس با پشتیبانی', url: `tel:${block.phone}` }]);
        }
        break;

      case 'tracking_request':
        pushText(
          `🔍 ${block.text || 'لطفاً شماره سفارش یا کد پیگیری خود را ارسال کنید تا وضعیت آن بررسی شود.'}`
        );
        break;

      default:
        // بلوک‌های ناشناخته — نادیده گرفته می‌شوند
        break;
    }
  }

  // ── 3. Suggested Actions → دکمه‌های inline ──────────────
  if (Array.isArray(response.suggestedActions) && response.suggestedActions.length > 0) {
    const actionRow = response.suggestedActions.map((action) => {
      const label = action.label || action.value || 'انتخاب';
      const data = action.value || action.callback_data || action.label || label;
      return { text: label, callback_data: data };
    });
    addButtonRow(actionRow);
  }

  // ── 4. مونتاژ نتیجه ─────────────────────────────────────
  result.text = textParts.join('\n\n').trim();

  if (keyboardRows.length > 0) {
    result.reply_markup = { inline_keyboard: keyboardRows };
  }

  // اگر متن شامل کاراکترهای Markdown است، parse_mode را فعال کن
  if (/[*_`\[\]]/.test(result.text)) {
    result.parse_mode = 'Markdown';
  }

  return result;
}

/**
 * تبدیل سریع Bale Inline-Keyboard به reply_markup فشرده
 * (برای مواردی که فقط دکمه نیاز است بدون متن اضافی)
 *
 * @param {Array<Array<{text:string, callback_data?:string, url?:string}>>} rows
 * @returns {Object} { inline_keyboard: rows }
 */
function makeInlineKeyboard(rows) {
  return { inline_keyboard: rows };
}

module.exports = { renderBaleMessage, makeInlineKeyboard };
