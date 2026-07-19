-- Notifications table migration
-- IMPORTANT: This file must not be executed during STEP 5.
-- Source of truth: docs/DATABASE_SOURCE_OF_TRUTH.md + docs/PROJECT_MAP.md.
-- Convention: matches supabase/create-projects-tasks.sql (table/index) and
--            supabase/rls-policies.sql (RLS/policy). No `public.` prefix
--            (repo convention), no FK to `users` (users is a VIEW).

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
    ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Idempotent policy guard (mirrors rls-policies.sql DO $$ DROP POLICY pattern),
-- scoped to this table only.
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname, tablename
                 FROM pg_policies
                 WHERE schemaname = 'public' AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

CREATE POLICY "notifications_admin_all" ON notifications
    USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));

CREATE POLICY "notifications_user_read" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_user_update" ON notifications
    FOR UPDATE USING (user_id = auth.uid());
