const { supabase, cors, requireAuth, requireAdmin } = require('./_lib');

// ═══════════════════════════════════════════════════════════════════════════
// unified-messages.js — Data Cleanup → Unified Messages (Admin Tools)
// ═══════════════════════════════════════════════════════════════════════════
// جدول: public.unified_messages  (schema موجود — Phase 0 Unified Communications)
//
// ⚠️  محدودیت MVP:
//   - این handler کاملاً read-only است. هیچ DELETE / PATCH / POST ندارد.
//   - حذف (destructive cleanup) در MVP فعال نیست — فقط بررسی و شناسایی
//     داده‌های تست/مهاجرت‌شده (preview) انجام می‌شود.
//
// اندپوینت‌ها:
//   GET  /api/unified-messages           → لیست پیام‌ها با فیلتر
//   GET  /api/unified-messages/stats     → آمار (total, by channel/status, unmapped)
//   سایر متدها → 405
//
// فیلترهای لیست (query params):
//   channel   : eq (whatsapp|instagram|telegram|email|phone)
//   status    : eq (pending|sent|delivered|read|failed|auto_replied|received)
//   search    : ilike روی sender_phone / channel_user_id / sender_name / message
//   unmapped  : 'true' → فقط پیام‌های بدون crm_customer_id (نامزدهای پاکسازی تستی)
//   mapped    : 'true' → فقط پیام‌های دارای crm_customer_id
//   limit     : پیش‌فرض ۵۰، حداکثر ۲۰۰
//   offset    : صفحه‌بندی
// ═══════════════════════════════════════════════════════════════════════════

const CHANNELS = ['whatsapp', 'instagram', 'telegram', 'email', 'phone'];
const STATUSES = ['pending', 'sent', 'delivered', 'read', 'failed', 'auto_replied', 'received'];

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

async function countRows(filterBuilder) {
  const { count, error } = await filterBuilder.select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ابزار ادمین — دسترسی فقط برای admin+
    requireAdmin(req);

    if (req.method !== 'GET') {
      // MVP: هیچ عملیات مخربی (delete/update) ارائه نمی‌شود
      return res.status(405).json({ ok: false, error: 'Method Not Allowed — این ابزار در MVP فقط read-only است' });
    }

    const pathname = (req.url || '').split('?')[0];
    const isStats = pathname.endsWith('/stats');

    // ─── آمار ─────────────────────────────────────────────────────────────
    if (isStats) {
      // هر بار یک query تازه با select می‌سازد تا فیلترهای eq/not/is در دسترس باشند
      // (این متدها فقط روی builder حاصل از select وجود دارند، نه روی from)
      const statsQuery = () =>
        supabase.from('unified_messages').select('id', { count: 'exact', head: true });

      const total = await countRows(statsQuery());

      const byChannel = {};
      for (const ch of CHANNELS) {
        byChannel[ch] = await countRows(statsQuery().eq('channel', ch));
      }
      const otherChannel = await countRows(statsQuery().not('channel', 'in', `(${CHANNELS.join(',')})`));

      const byStatus = {};
      for (const st of STATUSES) {
        byStatus[st] = await countRows(statsQuery().eq('status', st));
      }
      const otherStatus = await countRows(statsQuery().not('status', 'in', `(${STATUSES.join(',')})`));

      const unmapped = await countRows(statsQuery().is('crm_customer_id', null));
      const mapped = await countRows(statsQuery().not('crm_customer_id', 'is', null));

      return res.json({
        ok: true,
        total,
        by_channel: { ...byChannel, other: otherChannel },
        by_status: { ...byStatus, other: otherStatus },
        unmapped,
        mapped,
      });
    }

    // ─── لیست پیام‌ها ─────────────────────────────────────────────────────
    const { channel, status, search, unmapped, mapped } = req.query;
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let query = supabase.from('unified_messages').select('*', { count: 'exact' });

    if (channel) {
      if (!CHANNELS.includes(channel)) {
        return res.status(400).json({ ok: false, error: `channel نامعتبر است. مقادیر مجاز: ${CHANNELS.join(', ')}` });
      }
      query = query.eq('channel', channel);
    }

    if (status) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ ok: false, error: `status نامعتبر است. مقادیر مجاز: ${STATUSES.join(', ')}` });
      }
      query = query.eq('status', status);
    }

    if (unmapped === 'true') {
      query = query.is('crm_customer_id', null);
    } else if (mapped === 'true') {
      query = query.not('crm_customer_id', 'is', null);
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      query = query.or(
        `sender_phone.ilike.%${term}%,channel_user_id.ilike.%${term}%,sender_name.ilike.%${term}%,message.ilike.%${term}%`
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.message && error.message.includes('does not exist')) {
        return res.status(404).json({ ok: false, error: 'unified_messages table not found' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, total: count || 0, items: data || [] });

  } catch (e) {
    return res.status(e.status || 403).json({ ok: false, error: e.message });
  }
};
