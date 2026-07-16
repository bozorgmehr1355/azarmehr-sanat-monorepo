-- ============================================================================
-- Groups & Group Members Tables
-- اجرا در: Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. جدول groups (بدون FK)
CREATE TABLE IF NOT EXISTS groups (
  id              BIGSERIAL    PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  description     TEXT         DEFAULT '',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  groups           IS 'گروه‌های کاربری (تیم‌ها، دپارتمان‌ها)';
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

-- 2. جدول group_members (بدون FK constraint، فقط indexes)
CREATE TABLE IF NOT EXISTS group_members (
  group_id        BIGINT       NOT NULL,
  user_id         UUID         NOT NULL,
  joined_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- 3. RLS Policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- groups: همه SELECT، ادمین ALL
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'groups_select_all') THEN
    CREATE POLICY groups_select_all ON groups FOR SELECT TO public USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'groups_modify_admin') THEN
    CREATE POLICY groups_modify_admin ON groups FOR ALL TO public
    USING (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.system_role IN ('super_admin', 'admin')
      )
    );
  END IF;
END $$;

-- group_members: همه SELECT، ادمین ALL
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_members' AND policyname = 'group_members_select_all') THEN
    CREATE POLICY group_members_select_all ON group_members FOR SELECT TO public USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_members' AND policyname = 'group_members_modify_admin') THEN
    CREATE POLICY group_members_modify_admin ON group_members FOR ALL TO public
    USING (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.system_role IN ('super_admin', 'admin')
      )
    );
  END IF;
END $$;

-- 4. Seed data
INSERT INTO groups (name, description) VALUES
  ('گروه عمومی', 'همه کارمندان'),
  ('گروه فروش', 'تیم فروش و بازاریابی'),
  ('گروه پشتیبانی', 'تیم پشتیبانی مشتری'),
  ('گروه مدیریت', 'مدیران و رهبران')
ON CONFLICT DO NOTHING;