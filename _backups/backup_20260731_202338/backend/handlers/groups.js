const { cors, supabase, requireAuth, requireAdmin, requireSuperAdmin } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pathname = (req.url || '').split('?')[0].replace(/\/+$/, '');
    const parts = pathname.split('/').filter(Boolean);
    // Expected: /api/groups -> parts = ['api', 'groups']
    //           /api/groups/:id -> parts = ['api', 'groups', 'id']
    const subAction = parts.length > 2 ? parts[2] : null;
    const targetId = parts.length > 3 ? parts[3] : null;

    // ─── GET /api/groups ───
    if (req.method === 'GET' && !subAction) {
      requireAuth(req);
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return res.json({ groups: data || [] });
    }

    // ─── GET /api/groups/:id ───
    if (req.method === 'GET' && targetId) {
      requireAuth(req);
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', targetId)
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // ─── GET /api/groups/:id/members ───
    if (req.method === 'GET' && subAction === 'members' && targetId) {
      requireAuth(req);
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, groups!inner(name), users(id, full_name, username, role, system_role, avatar)')
        .eq('group_id', targetId);
      if (error) throw error;
      return res.json({ members: data || [] });
    }

    // ─── POST /api/groups ───
    if (req.method === 'POST') {
      requireAdmin(req);
      const { name, description } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name الزامی است' });
      const { data, error } = await supabase
        .from('groups')
        .insert([{ name, description: description || '' }])
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // ─── PUT /api/groups/:id ───
    if (req.method === 'PUT' && targetId) {
      requireAdmin(req);
      const { name, description } = req.body || {};
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', targetId)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // ─── DELETE /api/groups/:id ───
    if (req.method === 'DELETE' && targetId) {
      requireSuperAdmin(req);
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', targetId);
      if (error) throw error;
      return res.json({ success: true });
    }

    // ─── POST /api/groups/:id/members - add member ───
    if (req.method === 'POST' && subAction === 'members' && targetId) {
      requireAdmin(req);
      const { user_id } = req.body || {};
      if (!user_id) return res.status(400).json({ error: 'user_id الزامی است' });
      const { data, error } = await supabase
        .from('group_members')
        .insert([{ group_id: targetId, user_id }])
        .select('group_id, user_id, users(id, full_name, username, role, system_role, avatar)')
        .single();
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'کاربر قبلاً عضو این گروه است' });
        throw error;
      }
      return res.json(data);
    }

    // ─── DELETE /api/groups/:id/members/:userId - remove member ───
    if (req.method === 'DELETE' && subAction === 'members' && targetId && parts[4]) {
      requireAdmin(req);
      const userId = parts[4];
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', targetId)
        .eq('user_id', userId);
      if (error) throw error;
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'روش مجاز نیست' });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
};