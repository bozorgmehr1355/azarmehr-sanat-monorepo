const { cors, bcrypt, supabase, requireAuth, requireAdmin, requireSuperAdmin } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Parse sub-path:  /api/users              → parts = ['api','users']
    //                   /api/users/reset-password  → parts = ['api','users','reset-password']
    //                   /api/users/123/reset-password → parts = ['api','users','123','reset-password']
    const pathname = (req.url || '').split('?')[0].replace(/\/+$/, '');
    const parts = pathname.split('/').filter(Boolean);
    const resetIdx = parts.findIndex(p => p === 'reset-password');
    const subAction = resetIdx !== -1 ? 'reset-password' : (parts.length > 2 ? parts[2] : null);
    const targetId = (resetIdx > 2 && parts.length >= resetIdx + 1)
      ? parts[resetIdx - 1]
      : null;

    // ─── POST /api/users/reset-password (self reset) ───
    if (subAction === 'reset-password' && !targetId && req.method === 'POST') {
      const user = requireAuth(req);
      const { currentPassword, newPassword } = req.body || {};

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'currentPassword و newPassword الزامی است' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'رمز عبور جدید حداقل ۶ کاراکتر باید باشد' });
      }

      const { data: dbUser, error: fetchError } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .single();

      if (fetchError || !dbUser) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }

      if (!bcrypt.compareSync(currentPassword, dbUser.password)) {
        return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' });
      }

      const hashed = bcrypt.hashSync(newPassword, 10);
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashed })
        .eq('id', user.id);

      if (updateError) throw updateError;
      return res.json({ message: 'رمز عبور با موفقیت تغییر کرد' });
    }

    // ─── POST /api/users/:id/reset-password (admin force reset) ───
    if (targetId && subAction === 'reset-password' && req.method === 'POST') {
      requireAdmin(req);
      const { newPassword } = req.body || {};

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'newPassword باید حداقل ۶ کاراکتر باشد' });
      }

      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', targetId)
        .single();

      if (!dbUser) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }

      const hashed = bcrypt.hashSync(newPassword, 10);
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashed })
        .eq('id', targetId);

      if (updateError) throw updateError;
      return res.json({ message: 'رمز عبور کاربر با موفقیت بازنشانی شد' });
    }

    // ─── GET /api/users ───
    if (req.method === 'GET') {
      requireAuth(req);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, username, role, system_role, avatar, created_at, updated_at')
        .order('id');
      if (usersError) throw usersError;

      // دریافت دسترسی‌های RBAC برای همه کاربران (batch)
      let permissionsMap = {};
      try {
        const { data: allUserRoles } = await supabase
          .from('user_roles')
          .select('user_id, roles!inner(role_permissions(permission_key))');
        if (allUserRoles) {
          for (const ur of allUserRoles) {
            if (!permissionsMap[ur.user_id]) permissionsMap[ur.user_id] = new Set();
            for (const rp of ur.roles?.role_permissions || []) {
              permissionsMap[ur.user_id].add(rp.permission_key);
            }
          }
        }
      } catch {
        // RBAC tables ممکن است وجود نداشته باشند
      }

      const FALLBACK_PERMS = {
        super_admin: ['org_chart:view','org_chart:edit','admin_panel:view','users:manage','settings:manage','permissions:manage'],
        admin: ['org_chart:view','org_chart:edit','admin_panel:view'],
        user: ['org_chart:view']
      };

      const usersWithPerms = (users || []).map(u => ({
        ...u,
        permissions: permissionsMap[u.id]
          ? [...permissionsMap[u.id]]
          : (FALLBACK_PERMS[u.system_role] || FALLBACK_PERMS.user)
      }));

      let orgChart = [];
      try {
        const { data: ocData } = await supabase.from('org_chart').select('*');
        if (ocData) orgChart = ocData;
      } catch {
        // جدول org_chart ممکن است وجود نداشته باشد
      }

      return res.json({ users: usersWithPerms, orgChart });
    }

    // ─── POST /api/users (ایجاد کاربر جدید) ───
    if (req.method === 'POST') {
      requireAdmin(req);
      // Whitelist صریح برای جلوگیری از mass-assignment
      const PROFILE_FIELDS = ['full_name', 'username', 'avatar', 'password'];
      const PRIV_FIELDS = ['system_role', 'role'];
      const profileData = {};
      const privilegeData = {};
      for (const k of Object.keys(req.body || {})) {
        if (PROFILE_FIELDS.includes(k)) profileData[k] = req.body[k];
        else if (PRIV_FIELDS.includes(k)) privilegeData[k] = req.body[k];
        // سایر فیلدها (active، unknown) drop می‌شوند و اعمال نمی‌شوند
      }
      let insertData = { ...profileData };
      if (Object.keys(privilegeData).length > 0) {
        requireSuperAdmin(req); // تغییر نقش/سطح دسترسی فقط با مدیر ارشد
        insertData = { ...insertData, ...privilegeData };
      }
      if (insertData.password) {
        insertData.password = bcrypt.hashSync(insertData.password, 10);
      }
      if (!insertData.full_name || !insertData.username) {
        return res.status(400).json({ error: 'full_name و username الزامی است' });
      }
      const { data, error } = await supabase
        .from('users')
        .insert([insertData])
        .select('id, full_name, username, role, system_role, avatar, created_at, updated_at')
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // ─── PUT /api/users (ویرایش کاربر) ───
    if (req.method === 'PUT') {
      requireAdmin(req);
      const { id, ...body } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id الزامی است' });
      }

      // Whitelist صریح: جداسازی فیلدهای پروفایل از فیلدهای امتیازی
      const PROFILE_FIELDS = ['full_name', 'username', 'avatar'];
      const PRIV_FIELDS = ['system_role', 'role'];
      const profileUpdates = {};
      const privilegeUpdates = {};
      for (const k of Object.keys(body)) {
        if (PROFILE_FIELDS.includes(k)) profileUpdates[k] = body[k];
        else if (PRIV_FIELDS.includes(k)) privilegeUpdates[k] = body[k];
        // password و active و سایر فیلدهای ناشناخته drop می‌شوند (غیرقابل اعمال)
      }

      let updates = { ...profileUpdates };
      if (Object.keys(privilegeUpdates).length > 0) {
        requireSuperAdmin(req); // تغییر نقش/سطح دسترسی فقط با مدیر ارشد
        updates = { ...updates, ...privilegeUpdates };
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'هیچ فیلد مجازی برای بروزرسانی ارسال نشده است' });
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select('id, full_name, username, role, system_role, avatar, created_at, updated_at')
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // ─── DELETE /api/users ───
    if (req.method === 'DELETE') {
      requireSuperAdmin(req);
      const { id } = req.body;
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }

    // ─── USER ROLES CRUD ───
    // GET /api/users/:id/roles - get user's assigned roles
    if (req.method === 'GET' && targetId && !subAction) {
      requireAuth(req);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role_id, roles(id, key, title, level)')
        .eq('user_id', targetId);
      if (error) throw error;
      return res.json({ roles: data || [] });
    }

    // POST /api/users/:id/roles - assign role to user
    if (req.method === 'POST' && targetId && subAction === 'roles') {
      requireAdmin(req);
      const { role_id } = req.body || {};
      if (!role_id) return res.status(400).json({ error: 'role_id الزامی است' });
      const { data, error } = await supabase
        .from('user_roles')
        .insert([{ user_id: targetId, role_id }])
        .select('user_id, role_id, roles(id, key, title, level)')
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // DELETE /api/users/:id/roles/:roleId - remove role from user
    if (req.method === 'DELETE' && targetId && subAction === 'roles') {
      requireAdmin(req);
      const roleId = parts.length > 3 ? parts[3] : null;
      if (!roleId) return res.status(400).json({ error: 'roleId الزامی است' });
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetId)
        .eq('role_id', roleId);
      if (error) throw error;
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'روش مجاز نیست' });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
};
