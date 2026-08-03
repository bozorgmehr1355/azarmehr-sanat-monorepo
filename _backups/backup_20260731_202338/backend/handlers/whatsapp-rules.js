const { supabase, cors, requireAuth, requireAdmin } = require('./_lib');

// فیلدهایی که کلاینت نمی‌تواند مقداردهی کند (id=اتوماتیک, timestamps=دیتابیس)
const BLOCKED = new Set(['id', 'created_at', 'updated_at']);
const VALID_STATUS = new Set(['active', 'inactive']);

// id را از query (?id=eq.5 یا ?id=5) یا body می‌خواند و پیشوند eq. را حذف می‌کند
function extractId(req) {
  let raw = req.query?.id ?? req.body?.id;
  if (raw == null) return null;
  raw = String(raw);
  const m = raw.match(/^(?:eq|in|is)\.(.+)$/i);
  return m ? m[1] : raw;
}

// order=priority.asc → { col: 'priority', asc: true }
function parseOrder(req) {
  const o = req.query?.order;
  if (!o) return { col: 'priority', asc: true };
  const [col, dir] = String(o).split('.');
  return { col: col || 'priority', asc: (dir || 'asc').toLowerCase() !== 'desc' };
}

function sanitize(body) {
  const payload = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (!BLOCKED.has(k)) payload[k] = v;
  }
  if (payload.status !== undefined && !VALID_STATUS.has(payload.status))
    delete payload.status;
  if (payload.priority !== undefined) payload.priority = Number(payload.priority) || 0;
  return payload;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    /* ── GET ── */
    if (req.method === 'GET') {
      const id = extractId(req);
      const { col, asc } = parseOrder(req);
      let query = supabase.from('whatsapp_rules').select('*');
      if (id) query = query.eq('id', id);
      query = query.order(col, { ascending: asc });
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);   // همیشه آرایه → جلوگیری از rules.map is not a function
    }

    /* ── POST ── */
    if (req.method === 'POST') {
      requireAdmin(req);
      const payload = sanitize(req.body);
      if (!payload.condition_type)
        return res.status(400).json({ error: 'condition_type الزامی است' });
      if (payload.priority === undefined) payload.priority = 0;
      if (payload.status === undefined) payload.status = 'active';
      // فیلدهای اضافی جدول production (NOT NULL)
      if (payload.product_name === undefined) payload.product_name = 'all';
      if (payload.customer_grade === undefined) payload.customer_grade = 'standard';
      if (payload.price_value === undefined) payload.price_value = 0;
      if (payload.is_active === undefined) payload.is_active = true;
      const { data, error } = await supabase
        .from('whatsapp_rules').insert(payload).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    /* ── PUT / PATCH ── */
    if (req.method === 'PUT' || req.method === 'PATCH') {
      requireAdmin(req);
      const id = extractId(req);
      if (!id) return res.status(400).json({ error: 'id الزامی است' });

      const { id: _drop, ...rest } = req.body || {};
      const payload = sanitize(rest);
      if (Object.keys(payload).length === 0)
        return res.status(400).json({ error: 'هیچ فیلدی برای آپدیت ارسال نشده' });

      payload.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('whatsapp_rules').update(payload).eq('id', id).select().single();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'قانون پیدا نشد' });
      return res.json(data);
    }

    /* ── DELETE ── */
    if (req.method === 'DELETE') {
      requireAdmin(req);
      const id = extractId(req);
      if (!id) return res.status(400).json({ error: 'id الزامی است' });
      const { error } = await supabase.from('whatsapp_rules').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};
