-- ============================================================================
-- RBAC (Role-Based Access Control) — Migration
-- پروژه: آذرمهر صنعت
--
-- جدول roles از قبل وجود دارد (id, key, title, level, created_at)
-- این فایل فقط جدول‌های user_roles و role_permissions می‌سازد
-- و seed data را درج می‌کند.
-- ============================================================================

-- ============================================================================
-- 1. user_roles  (junction: user ↔ role)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id         BIGINT       NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

COMMENT ON TABLE  user_roles            IS 'انتساب نقش به کاربران (many-to-many)';
COMMENT ON COLUMN user_roles.user_id    IS 'FK → users(id)';
COMMENT ON COLUMN user_roles.role_id    IS 'FK → roles(id)';

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ============================================================================
-- 2. role_permissions  (junction: role ↔ permission_key)
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id              BIGSERIAL    PRIMARY KEY,
  role_id         BIGINT       NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key  VARCHAR(200) NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, permission_key)
);

COMMENT ON TABLE  role_permissions              IS 'کلیدهای دسترسی هر نقش';
COMMENT ON COLUMN role_permissions.role_id      IS 'FK → roles(id)';
COMMENT ON COLUMN role_permissions.permission_key IS 'کلید دسترسی مثل org_chart:view';

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- ============================================================================
-- 3. Seed data — دسترسی‌های هر نقش (با تطبیق با schema موجود: key بجای name)
-- ============================================================================
-- super_admin (id=1, key='super_admin'): همه دسترسی‌ها
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
CROSS JOIN (VALUES
  ('org_chart:view'),
  ('org_chart:edit'),
  ('admin_panel:view'),
  ('users:manage'),
  ('settings:manage'),
  ('permissions:manage')
) AS p(key)
WHERE r.key = 'super_admin'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- admin (id=2, key='admin'): پنل مدیریت + چارت (ویرایش)
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
CROSS JOIN (VALUES
  ('org_chart:view'),
  ('org_chart:edit'),
  ('admin_panel:view')
) AS p(key)
WHERE r.key = 'admin'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- user (id=7, key='user'): فقط مشاهده چارت
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
CROSS JOIN (VALUES
  ('org_chart:view')
) AS p(key)
WHERE r.key = 'user'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- ============================================================================
-- 4. Seed data — انتساب کاربران موجود به نقش‌ها (بر اساس system_role)
-- ============================================================================
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.key = u.system_role
ON CONFLICT (user_id, role_id) DO NOTHING;
