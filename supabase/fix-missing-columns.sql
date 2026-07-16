-- =====================================================
-- FIX: اضافه کردن ستون‌های کمبود در جداول MVP
-- این migration فقط ستون‌هایی را اضافه می‌کند که در handler code
-- استفاده می‌شوند ولی در CREATE TABLE IF NOT EXISTS وجود نداشتند
-- =====================================================

-- 1. project_tasks: اضافه کردن creator_id
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS creator_id UUID;

-- 2. meetings: اضافه کردن scheduled_at, meeting_type, notes
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. task_progress_updates: اضافه کردن created_by
ALTER TABLE task_progress_updates ADD COLUMN IF NOT EXISTS created_by UUID;

-- 4. task_blockers: اضافه کردن resolved
ALTER TABLE task_blockers ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;
