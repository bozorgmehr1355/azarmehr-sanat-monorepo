const { cors, supabase, requireAuth, requireAdmin, requireSuperAdmin } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pathname = (req.url || '').split('?')[0].replace(/\/+$/, '');
    const parts = pathname.split('/').filter(Boolean);
    const subAction = parts.length > 2 ? parts[2] : null;
    const targetId = parts.length > 3 ? parts[3] : null;

    // GET /api/roles - list all roles
    if (req.method === 'GET' && !targetId) {
      requireAuth(req);
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('level', { ascending: false });
      if (error) throw error;
      return res.json({ roles: data || [] });
    }

    // GET /api/roles/:id - get single role
    if (req.method === 'GET' && targetId) {
      requireAuth(req);
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', targetId)
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // POST /api/roles - create new role (super_admin only)
    if (req.method === 'POST') {
      requireSuperAdmin(req);
      const { key, title, level } = req.body || {};
      if (!key || !title) return res.status(400).json({ error: 'key و title الزامی هستند' });
      const { data, error } = await supabase
        .from('roles')
        .insert([{ key, title, level: level || 10 }])
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // PUT /api/roles/:id - update role (super_admin only)
    if (req.method === 'PUT' && targetId) {
      requireSuperAdmin(req);
      const { key, title, level } = req.body || {};
      const { data, error } = await supabase
        .from('roles')
        .update({ key, title, level })
        .eq('id', targetId)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // DELETE /api/roles/:id - delete role (super_admin only)
    if (req.method === 'DELETE' && targetId) {
      requireSuperAdmin(req);
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', targetId);
      if (error) throw error;
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'روش مجاز نیست' });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
};