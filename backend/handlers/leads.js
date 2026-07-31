const { supabase, cors, requireAuth } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    requireAuth(req);

    if (req.method === 'GET') {
      let query = supabase.from('leads').select('*');

      // Optional status filter
      if (req.query.status) {
        query = query.eq('status', req.query.status);
      }

      // Optional search by mobile (q or search param)
      const searchTerm = req.query.q || req.query.search;
      if (searchTerm) {
        query = query.ilike('mobile', `%${searchTerm}%`);
      }

      query = query.order('last_message_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json(data || []);
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};

      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }

      const { data, error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id)
        .select();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json(data || { success: true });
    }

    return res.status(405).json({ error: 'متد مجاز نیست' });

  } catch (e) {
    return res.status(e.status || 403).json({ error: e.message });
  }
};
