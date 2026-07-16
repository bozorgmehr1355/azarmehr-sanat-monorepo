-- ============================================================================
-- Groups & Group Members Tables
-- پروژه: آذرمهر صنعت
-- اجرا در: Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. جدول groups
CREATE TABLE IF NOT EXISTS groups (
  id              BIGSERIAL    PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  description     TEXT         DEFAULT '',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  groups            IS 'گروه‌های کاربری (مثل تیم‌ها، دپارتمان‌ها)';
COMMENT ON COLUMN groups.name       IS 'نام گروه';
COMMENT ON COLUMN groups.description IS 'توضیحات گروه';

CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

-- 2. جدول group_members (junction: group ↔ user)
CREATE TABLE IF NOT EXISTS group_members (
  group_id        BIGINT       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id         UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

COMMENT ON TABLE  group_members           IS 'اعضای گروه‌ها (many-to-many)';
COMMENT ON COLUMN group_members.group_id  IS 'FK → groups(id)';
COMMENT ON COLUMN group_members.user_id   IS 'FK → public.users(id)';

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- 3. RLS Policies
-- groups: everyone can read, only admins can write
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'groups_read_all') THEN
    CREATE POLICY groups_read_all ON groups FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'groups_write_admin') THEN
    CREATE POLICY groups_write_admin ON groups FOR ALL TO public USING (
      EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role IN ('super_admin','admin'))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role IN ('super_admin','admin'))
    );
  END IF;
END $$;

-- group_members: everyone can read, admins can write
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_members' AND policyname = 'group_members_read_all') THEN
    CREATE POLICY group_members_read_all ON group_members FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_members' AND policyname = 'group_members_write_admin') THEN
    CREATE POLICY group_members_write_admin ON group_members FOR ALL TO public USING (
      EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role IN ('super_admin','admin'))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.system_role IN ('super_admin','admin'))
    );
  END IF;
END $$;

-- 4. Trigger برای updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'groups_updated_at') THEN
    CREATE TRIGGER groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;