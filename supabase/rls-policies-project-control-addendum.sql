-- ============================================================================
-- RLS Addendum — Project Control missing policies (PROPOSED, NOT EXECUTED)
-- پروژه: آذرمهر صنعت
--
-- ⚠️ این فایل فقط پیشنهادی است و در تسک آمادگی migration اجرا نشده است.
-- اجرا در: Supabase Dashboard → SQL Editor → Paste → Run
-- ترتیب: حتماً بعد از supabase/rls-policies.sql اجرا شود.
--    (اگر rls-policies.sql دوباره اجرا شود، بلوک DO آن همهٔ policyها را حذف
--     می‌کند → این فایل باید مجدداً بعد از آن اجرا شود.)
-- ============================================================================

-- ── Idempotency guards (DROP before CREATE) ──────────────────────────────
DROP POLICY IF EXISTS "tpu_admin_all"            ON task_progress_updates;
DROP POLICY IF EXISTS "tpu_children_read"        ON task_progress_updates;
DROP POLICY IF EXISTS "tb_admin_all"             ON task_blockers;
DROP POLICY IF EXISTS "tb_children_read"         ON task_blockers;
DROP POLICY IF EXISTS "mai_admin_all"            ON meeting_action_items;
DROP POLICY IF EXISTS "mai_member_read"          ON meeting_action_items;

-- ── 1. task_progress_updates ─────────────────────────────────────────────
CREATE POLICY "tpu_admin_all" ON task_progress_updates
  USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));

CREATE POLICY "tpu_children_read" ON task_progress_updates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_tasks
    WHERE id = task_progress_updates.project_task_id
      AND (assigned_to = auth.uid() OR creator_id = auth.uid())
  ));

-- ── 2. task_blockers ─────────────────────────────────────────────────────
CREATE POLICY "tb_admin_all" ON task_blockers
  USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));

CREATE POLICY "tb_children_read" ON task_blockers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_tasks
    WHERE id = task_blockers.project_task_id
      AND (assigned_to = auth.uid() OR creator_id = auth.uid())
  ));

-- ── 3. meeting_action_items ──────────────────────────────────────────────
CREATE POLICY "mai_admin_all" ON meeting_action_items
  USING (auth.jwt() ->> 'system_role' IN ('super_admin','admin'));

CREATE POLICY "mai_member_read" ON meeting_action_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meetings m
    JOIN project_members pm ON pm.project_id = m.project_id
    WHERE m.id = meeting_action_items.meeting_id
      AND pm.user_id = auth.uid()
  ));
