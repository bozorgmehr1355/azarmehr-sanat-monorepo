-- ============================================================================
-- Reporting Indexes — Phase 2B
-- پروژه: آذرمهر صنعت
--
-- ⚠️  فقط ساخته شده، اجرا نشده — باید در Supabase Dashboard اجرا شود
-- اجرا در: Supabase Dashboard → SQL Editor → Paste → Run
-- ============================================================================

-- ============================================================================
-- 1. project_members — برای auth scope و membership lookup
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pm_user_project
  ON project_members(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_pm_project_id
  ON project_members(project_id);

-- ============================================================================
-- 2. project_tasks — فیلترها و aggregation گزارش‌ها
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pt_project_id
  ON project_tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_pt_assigned_to
  ON project_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_pt_status
  ON project_tasks(status);

CREATE INDEX IF NOT EXISTS idx_pt_due_date
  ON project_tasks(due_date)
  WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pt_created_at
  ON project_tasks(created_at DESC);

-- ترکیبی برای query overdue
CREATE INDEX IF NOT EXISTS idx_pt_overdue
  ON project_tasks(project_id, status, due_date)
  WHERE due_date IS NOT NULL AND status NOT IN ('ARCHIVED','CANCELLED','APPROVED');

-- ترکیبی برای performance lookup
CREATE INDEX IF NOT EXISTS idx_pt_assignee_status
  ON project_tasks(assigned_to, status);

-- ============================================================================
-- 3. task_blockers — blocked task reports
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tb_project_task_id
  ON task_blockers(project_task_id);

-- ⚠️ ستون resolved ممکن است وجود نداشته باشد — اگر وجود داشته باشد:
-- CREATE INDEX IF NOT EXISTS idx_tb_unresolved
--   ON task_blockers(project_task_id, status)
--   WHERE status = 'OPEN';

-- ============================================================================
-- 4. task_status_history — محاسبه completion time
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tsh_task_status
  ON task_status_history(project_task_id, status, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_tsh_task_id
  ON task_status_history(project_task_id);

-- ============================================================================
-- 5. meetings — گزارش جلسات
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_meet_project_id
  ON meetings(project_id);

CREATE INDEX IF NOT EXISTS idx_meet_organizer_id
  ON meetings(organizer_id);

CREATE INDEX IF NOT EXISTS idx_meet_date
  ON meetings(meeting_date DESC);

-- ============================================================================
-- 6. meeting_action_items — action items open count
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mai_meeting_id
  ON meeting_action_items(meeting_id);

CREATE INDEX IF NOT EXISTS idx_mai_status
  ON meeting_action_items(status);

-- ============================================================================
-- 7. audit_logs — فیلتر actor و entity
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON audit_logs(actor_id);

-- ============================================================================
-- 8. ai_drafts — approval status filter
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ad_status
  ON ai_drafts(approval_status);
