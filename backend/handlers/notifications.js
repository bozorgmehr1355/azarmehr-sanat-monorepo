const { supabase, cors, requireAuth, requireAdmin } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const me = requireAuth(req);
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', me.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.json(data || []);
    }

    if (req.method === 'PATCH') {
      console.log('PATCH body:', req.body, typeof req.body);
      const { id, read } = req.body;
      const { error } = await supabase
        .from('notifications')
        .update({ read })
        .eq('id', id)
        .eq('user_id', me.id);
      if (error) throw error;
      return res.json({ success: true });
    }

    if (req.method === 'POST') {
      requireAdmin(req);
      const raw = req.body;
      const items = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
      if (items.length === 0) {
        return res.status(400).json({ error: 'empty payload' });
      }
      const toInsert = [];
      for (const item of items) {
        const user_idRaw = item.user_id;
        const message = typeof item.message === 'string' ? item.message.trim() : '';
        if (typeof user_idRaw !== 'string' || user_idRaw.trim() === '' || message === '') {
          return res.status(400).json({ error: 'user_id and message are required' });
        }
        toInsert.push({
          user_id: user_idRaw.trim(),
          message,
          read: item.read === true || item.read === 'true',
        });
      }
      const { data, error } = await supabase
        .from('notifications')
        .insert(toInsert)
        .select();
      if (error) throw error;
      return res.status(201).json(data || { success: true });
    }

    res.status(405).end();
  } catch(e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
