-- ============================================================================
-- اضافه کردن ستون‌های فایل به جدول messages
-- ============================================================================
-- اجرا در: Supabase Dashboard → SQL Editor
-- ============================================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url  TEXT DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name VARCHAR DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type VARCHAR DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size VARCHAR DEFAULT NULL;
