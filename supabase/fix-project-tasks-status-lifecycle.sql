-- ============================================================================
-- Fix project_tasks status lifecycle — Phase 2B follow-up (final version)
-- پروژه: آذرمهر صنعت
--
-- این migration موارد زیر را به ترتیب انجام می‌دهد:
-- 1. اضافه کردن ستون completed_at (idempotent)
-- 2. حذف CHECK constraint قدیمی (قبل از هر UPDATE)
-- 3. نرمال‌سازی pending → ASSIGNED
-- 4. تنظیم DEFAULT به ASSIGNED
-- 5. اضافه کردن CHECK constraint جدید با ۱۳ وضعیت رسمی
-- 6. اضافه کردن INDEX برای completed_at
-- 7. COMMENT برای completed_at
--
-- اجرا در: Supabase Dashboard → SQL Editor → Paste → Run
-- ============================================================================

-- ── PRE-MIGRATION CHECK ───────────────────────────────────────────────────
-- برای بررسی وضعیت فعلی داده‌ها قبل از migration:
-- SELECT status, COUNT(*)
-- FROM project_tasks
-- GROUP BY status
-- ORDER BY status;

BEGIN;

-- ── 1. اضافه کردن ستون completed_at (idempotent) ─────────────────────────
ALTER TABLE project_tasks
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ── 2. حذف CHECK constraint قدیمی ────────────────────────────────────────
-- حتماً قبل از UPDATE انجام می‌شود چون constraint فعلی ممکن است
-- مقدار 'ASSIGNED' را قبول نکند.
ALTER TABLE project_tasks
DROP CONSTRAINT IF EXISTS project_tasks_status_check;

-- ── 3. نرمال‌سازی داده‌های قدیمی ──────────────────────────────────────────
-- فقط pending → ASSIGNED (هیچ مقدار ناشناخته‌ای به ASSIGNED تبدیل نمی‌شود)
UPDATE project_tasks
SET status = 'ASSIGNED',
    updated_at = timezone('utc'::text, now())
WHERE LOWER(TRIM(status)) = 'pending';

-- Diagnostic: برای بررسی مقادیر ناشناخته بعد از migration:
-- SELECT status, COUNT(*)
-- FROM project_tasks
-- WHERE status NOT IN (
--   'ASSIGNED', 'SEEN', 'ACKNOWLEDGED', 'NEEDS_CLARIFICATION',
--   'CANCELLED', 'IN_PROGRESS', 'SUBMITTED', 'BLOCKED',
--   'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'ARCHIVED', 'OVERDUE'
-- )
-- GROUP BY status
-- ORDER BY status;

-- ── 4. تنظیم DEFAULT به ASSIGNED ──────────────────────────────────────────
ALTER TABLE project_tasks
ALTER COLUMN status SET DEFAULT 'ASSIGNED';

-- ── 5. اضافه کردن CHECK constraint جدید ──────────────────────────────────
-- ۱۳ وضعیت رسمی — برگرفته از SSOT در backend/handlers/project-tasks.js
ALTER TABLE project_tasks
ADD CONSTRAINT project_tasks_status_check
CHECK (status IN (
  'ASSIGNED',
  'SEEN',
  'ACKNOWLEDGED',
  'NEEDS_CLARIFICATION',
  'CANCELLED',
  'IN_PROGRESS',
  'SUBMITTED',
  'BLOCKED',
  'APPROVED',
  'REJECTED',
  'REVISION_REQUESTED',
  'ARCHIVED',
  'OVERDUE'
));

-- ── 6. اضافه کردن INDEX اختیاری برای completed_at ────────────────────────
CREATE INDEX IF NOT EXISTS idx_project_tasks_completed_at
ON project_tasks(completed_at)
WHERE completed_at IS NOT NULL;

-- ── 7. COMMENT برای ستون completed_at ─────────────────────────────────────
COMMENT ON COLUMN project_tasks.completed_at
IS 'Timestamp when task entered a final completed/rejected/archived state';

COMMIT;
