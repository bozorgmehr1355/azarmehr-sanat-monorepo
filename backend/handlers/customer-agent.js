const { supabase, cors, requireAuth } = require('./_lib');
const { writeAuditLog } = require('./_audit');

/**
 * Customer Follow-up Agent MVP — Suggest endpoint
 *
 * POST /api/customer-agent/suggest
 *
 * دریافت پیام مشتری و ذخیرهٔ یک suggested reply در جدول موجود ai_drafts.
 * - احراز هویت: کاربر لاگین‌شده الزامی (مثل create در ai-drafts).
 * - هیچ AI واقعی وصل نشده؛ پاسخ پیشنهادی قالبی و امن است.
 * - AI قیمت/تخفیف/موجودی/وعده ارسال تولید نمی‌کند.
 * - فقط ستون‌های تأییدشدهٔ ai_drafts استفاده می‌شوند (بدون metadata اضافه).
 */

const SAFE_SUGGESTED_REPLY =
  'سلام، پیام شما دریافت شد. برای بررسی دقیق‌تر سفارش یا درخواست شما، ' +
  'لطفاً نام محصول، تعداد موردنظر و شهر مقصد را ارسال کنید. ' +
  'اعلام قیمت نهایی فقط از طریق پرتال رسمی انجام می‌شود.';

/**
 * اعتبارسنجی UUID (بدون وابستگی خارجی).
 * فقط customer_id معتبر UUID اجازه ورود به ستون entity_id (نوع UUID) را دارد.
 */
function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'متد یا مسیر مجاز نیست' });
    }

    const me = requireAuth(req);

    const {
      customer_id,
      customer_phone,
      customer_name,
      channel,
      message,
      context,
    } = req.body || {};

    // ─── اعتبارسنجی message ───
    if (typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'message الزامی است' });
    }

    const inputText = message.trim();

    // ─── انتخاب entity_id ───
    // entity_id از نوع UUID است؛ فقط customer_id معتبر UUID پذیرفته می‌شود.
    // customer_phone هرگز نباید به entity_id داده شود (باعث خطای نوع uuid می‌شد).
    // در MVP: اگر customer_id نامعتبر بود، reject نمی‌کنیم و فقط null می‌گذاریم.
    const entityId = isUuid(customer_id) ? customer_id : null;

    const { data, error } = await supabase
      .from('ai_drafts')
      .insert({
        entity_type: 'customer_agent',
        entity_id: entityId,
        draft_type: 'suggested_reply',
        input_text: inputText,
        output_text: SAFE_SUGGESTED_REPLY,
        created_by: me.id,
        approval_status: 'PENDING',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await writeAuditLog(supabase, {
      actor_id: me.id,
      action: 'create',
      entity_type: 'ai_draft',
      entity_id: data.id,
      old_values: null,
      new_values: { entity_type: 'customer_agent', draft_type: 'suggested_reply', entity_id: entityId },
    });

    return res.status(201).json({ ok: true, draft: data });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};
