/**
 * WhatsApp Broadcast — send customer welcome message
 * ==================================================
 * POST /api/send-customer-welcome
 *      → sends a WhatsApp welcome message to the newly registered customer
 *        via the UltraMsg gateway (reuses _lib.sendWhatsAppMessage).
 *
 * Called from wholesale-portal/index.html:269 (fire-and-forget at customer login).
 * Payload: { phone, name, customer_id }
 *
 * No auth gate: the caller is an anonymous post-login browser flow and does
 * not send an Authorization header; the original (now ghost) call was public.
 * The endpoint only sends a welcome text — it does not read/modify protected
 * data beyond a best-effort welcome notification.
 *
 * Source-of-truth for gateway: whatsapp-broadcast-api/api/_lib.js
 */

const { supabase, cors, sendWhatsAppMessage, formatPhone } = require('./_lib');

function parseBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch (_) {
        resolve({});
      }
    });
  });
}

const WELCOME_TEMPLATE = (name) =>
  `سلام${name ? ' ' + name : ''} عزیز، به خانواده چای عقرب خوش آمدید! 🍵 ` +
  `از اینکه ما را انتخاب کردید متشکریم. برای پیگیری سفارش‌ها و دریافت جدیدترین محصولات، ` +
  `از طریق همین شماره با ما در ارتباط باشید.`;

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method === 'OPTIONS') return; // cors already ended response

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    const phoneRaw = body && body.phone ? String(body.phone).trim() : '';
    const name = body && body.name ? String(body.name).trim() : '';
    const customerId = body && body.customer_id != null ? body.customer_id : null;

    if (!phoneRaw) {
      return res.status(400).json({ error: 'phone is required' });
    }

    const recipient = formatPhone(phoneRaw);
    const message = WELCOME_TEMPLATE(name);

    const result = await sendWhatsAppMessage(recipient, message);

    if (!result.sent) {
      // Gateway rejected/errored — still 200 to the caller (fire-and-forget),
      // but report the gateway outcome for observability.
      return res.json({
        success: false,
        welcome_sent: false,
        customer_id: customerId,
        gateway_error: result.error || 'ultramsg send failed',
      });
    }

    return res.status(200).json({
      success: true,
      welcome_sent: true,
      customer_id: customerId,
      message_id: result.messageId || null,
    });
  } catch (e) {
    // Never throw to the fire-and-forget caller; return JSON.
    return res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
};
