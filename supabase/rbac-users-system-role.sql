-- ============================================================================
-- RBAC — users.system_role + roles source-control + RLS (REVIEW ONLY, NOT EXECUTED)
-- پروژه: آذرمهر صنعت
-- هدف: رفع Blocker F2
--   ۱) افزودن ستون system_role به users (اگر نباشد)
--   ۲) source-control جدول roles (CREATE TABLE IF NOT EXISTS + seed اولیه)
--   ۳) RLS ENABLE + policies برای roles, user_roles, role_permissions
-- اجرا در: Supabase Dashboard → SQL Editor (منوط به تأیید مالک + backup)
-- کنوانسیون repo: IF NOT EXISTS؛ RLS + policy guard؛ بدون FK به users در صورت VIEW بودن
-- ⚠️ فرض: users جدول واقعی است (create-groups-tables.sql به public.users(id) REFERENCES دارد).
--    اگر users در محیط زنده VIEW باشد، ADD COLUMN شکست می‌خورد → نیاز به بررسی live.
-- ============================================================================

-- ─── ۱. ستون system_role روی users ───
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'system_role'
  ) THEN
    ALTER TABLE users ADD COLUMN system_role TEXT NOT NULL DEFAULT 'user'
      CHECK (system_role IN ('super_admin','admin','user'));
  END IF;
END $$;

COMMENT ON COLUMN users.system_role IS 'سطح دسترسی کلان: super_admin | admin | user (مبنای requireAdmin/requireSuperAdmin)';

-- ─── ۲. source-control جدول roles (اگر وجود نداشته باشد) ───
CREATE TABLE IF NOT EXISTS roles (
  id          BIGSERIAL    PRIMARY KEY,
  key         VARCHAR(50)  NOT NULL UNIQUE,
  title       TEXT         NOT NULL,
  level       INTEGER      NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  roles       IS 'نقش‌های سیستم (RBAC)';
COMMENT ON COLUMN roles.key   IS 'شناسه پایدار نقش (super_admin, admin, user, ...)';

CREATE INDEX IF NOT EXISTS idx_roles_key ON roles(key);

-- Seed اولیه (idempotent — فقط بر اساس key بررسی می‌شود تا رکورد موجود بازنویسی نشود)
-- توجه: اگر roles در live پر باشد، رکوردهای هم‌نام با id متفاوت دست‌نخورده باقی می‌مانند.
INSERT INTO roles (id, key, title, level) VALUES
  (1, 'super_admin', 'مدیر ارشد', 100),
  (2, 'admin',       'مدیر',      50),
  (7, 'user',        'کاربر',     10)
ON CONFLICT (key) DO NOTHING;

-- ─── ۳. RLS برای roles / user_roles / role_permissions ───
-- توجه: user_roles و role_permissions در rbac-tables.sql ساخته می‌شوند؛ اینجا فقط RLS را تضمین می‌کنیم.
ALTER TABLE roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- roles: همه می‌خوانند، فقط super_admin می‌نویسد
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'roles' AND policyname = 'roles_read_all') THEN
    CREATE POLICY roles_read_all ON roles FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'roles' AND policyname = 'roles_write_super_admin') THEN
    CREATE POLICY roles_write_super_admin ON roles
      FOR ALL TO public
      USING     (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role = 'super_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role = 'super_admin'));
  END IF;
END $$;

-- user_roles: کاربر نقش خودش را می‌بیند؛ admin مدیریت می‌کند
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'user_roles_read') THEN
    CREATE POLICY user_roles_read ON user_roles
      FOR SELECT TO public
      USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role IN ('super_admin','admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'user_roles_write_admin') THEN
    CREATE POLICY user_roles_write_admin ON user_roles
      FOR ALL TO public
      USING     (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role IN ('super_admin','admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role IN ('super_admin','admin')));
  END IF;
END $$;

-- role_permissions: همه می‌خوانند، فقط super_admin مدیریت می‌کند
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'role_permissions_read') THEN
    CREATE POLICY role_permissions_read ON role_permissions FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'role_permissions_write_super_admin') THEN
    CREATE POLICY role_permissions_write_super_admin ON role_permissions
      FOR ALL TO public
      USING     (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role = 'super_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role = 'super_admin'));
  END IF;
END $$;
