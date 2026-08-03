const { supabase, cors, requireAdmin } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ─── GET: مشاهده لاگ‌ها (فقط ادمین) ───
    if (req.method === 'GET') {
      requireAdmin(req);

      let query = supabase
        .from('audit_logs')
        .select('*');

      // فیلتر: entity_type
      if (req.query.entity_type) {
        const val = String(req.query.entity_type).replace(/^eq\./, '');
        query = query.eq('entity_type', val);
      }

      // فیلتر: entity_id
      if (req.query.entity_id) {
        const val = String(req.query.entity_id).replace(/^eq\./, '');
        query = query.eq('entity_id', val);
      }

      // فیلتر: actor_id
      if (req.query.actor_id) {
        const val = String(req.query.actor_id).replace(/^eq\./, '');
        query = query.eq('actor_id', val);
      }

      // فیلتر: action
      if (req.query.action) {
        const val = String(req.query.action).replace(/^eq\./, '');
        query = query.eq('action_type', val);
      }

      // مرتب‌سازی: جدیدترین اول
      query = query.order('created_at', { ascending: false });

      // محدودیت تعداد (پیش‌فرض ۱۰۰، حداکثر ۵۰۰)
      let limit = parseInt(req.query.limit, 10) || 100;
      if (limit > 500) limit = 500;
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};
