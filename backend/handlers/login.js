const { supabase, jwt, JWT_SECRET, cors } = require('./_lib');
const bcrypt = require('bcryptjs');

/**
 * استخراج دسترسی‌های کاربر از RBAC tables (user_roles → roles → role_permissions)
 * اگر RBAC tables خالی باشند (مigration اجرا نشده)، بر اساس system_role fallback می‌دهد.
 */
async function getUserPermissions(userId, systemRole) {
  try {
    // 1. تلاش برای گرفتن permissions از RBAC tables
    const { data: rolesWithPerms } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles!inner (
          role_permissions ( permission_key )
        )
      `)
      .eq('user_id', userId);

    const extracted = rolesWithPerms
      ? [...new Set(
          rolesWithPerms.flatMap(ur =>
            ur.roles?.role_permissions?.map(rp => rp.permission_key) ?? []
          )
        )]
      : [];

    if (extracted.length > 0) return extracted;

    // 2. Fallback: اگر RBAC migration اجرا نشده، بر اساس system_role
    const FALLBACK_PERMISSIONS = {
      super_admin: [
        'org_chart:view',
        'org_chart:edit',
        'admin_panel:view',
        'users:manage',
        'settings:manage',
        'permissions:manage',
        'chat:view',
        'payments:view',
        'crm:view'
      ],
      admin: [
        'org_chart:view',
        'org_chart:edit',
        'admin_panel:view',
        'chat:view',
        'payments:view',
        'crm:view'
      ],
      user: [
        'org_chart:view'
      ]
    };
    return FALLBACK_PERMISSIONS[systemRole] || FALLBACK_PERMISSIONS.user;
  } catch {
    // 3. خطا در خواندن RBAC (مثلاً جدول وجود ندارد)
    return ['org_chart:view'];
  }
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, username, password, role, system_role, avatar')
      .eq('username', username)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const user = data;

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    // دریافت دسترسی‌ها از RBAC
    const permissions = await getUserPermissions(user.id, user.system_role);

    const token = jwt.sign(
      { id: user.id, username: user.username, system_role: user.system_role, permissions },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        role: user.role,
        system_role: user.system_role,
        avatar: user.avatar,
        permissions
      }
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
