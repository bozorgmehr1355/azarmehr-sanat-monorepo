const { cors, supabase, requireAuth, requireAdmin, requireSuperAdmin } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const pathname = (req.url || '').split('?')[0].replace(/\/+$/, '');
    const parts = pathname.split('/').filter(Boolean);
    // Expected: /api/role-permissions -> parts = ['api', 'role-permissions']
    //           /api/role-permissions/role/:roleId -> subAction = 'role', targetId = roleId
    //           /api/role-permissions/:id -> targetId = permission id

    const subAction = parts.length > 2 ? parts[2] : null; // 'role' or permission id
    const targetId = parts.length > 3 ? parts[3] : null;

    // GET /api/role-permissions/role/:roleId - get all permissions for a role
    if (req.method === 'GET' && subAction === 'role' && targetId) {
      requireAuth(req);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('id, permission_key, created_at')
        .eq('role_id', targetId)
        .order('permission_key');
      if (error) throw error;
      return res.json({ permissions: data || [] });
    }

    // GET /api/role-permissions - get all role_permissions (with role info)
    if (req.method === 'GET' && !subAction) {
      requireAuth(req);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('id, role_id, permission_key, created_at, roles(id, key, title)')
        .order('role_id');
      if (error) throw error;
      return res.json({ rolePermissions: data || [] });
    }

    // POST /api/role-permissions - add permission to role (super_admin only)
    if (req.method === 'POST') {
      requireSuperAdmin(req);
      const { role_id, permission_key } = req.body || {};
      if (!role_id || !permission_key) return res.status(400).json({ error: 'role_id و permission_key الزامی هستند' });
      // Insert without complex join — just return the inserted row
      const { data, error } = await supabase
        .from('role_permissions')
        .insert([{ role_id, permission_key }])
        .select('id, role_id, permission_key, created_at')
        .single();
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'این دسترسی قبلاً برای این نقش وجود دارد' });
        // Return structured error instead of throwing
        const errMsg = error.message || JSON.stringify(error);
        console.error('[rolePermissions POST] insert error:', errMsg, 'code:', error.code);
        return res.status(500).json({ error: errMsg });
      }
      return res.json({ permission: data });
    }

    // DELETE /api/role-permissions/:id - remove permission from role (super_admin only)
    if (req.method === 'DELETE' && targetId && !subAction) {
      requireSuperAdmin(req);
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('id', targetId);
      if (error) throw error;
      return res.json({ success: true });
    }

    // DELETE /api/role-permissions/role/:roleId/:permissionKey - remove by role and permission
    if (req.method === 'DELETE' && subAction === 'role' && targetId && parts[4]) {
      requireSuperAdmin(req);
      const permissionKey = parts[4];
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', targetId)
        .eq('permission_key', permissionKey);
      if (error) throw error;
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'روش مجاز نیست' });
  } catch (err) {
    console.error('[rolePermissions] handler error:', err);
    const message = err.message || JSON.stringify(err) || 'خطای ناشناخته';
    res.status(err.status || 500).json({ error: message });
  }
};