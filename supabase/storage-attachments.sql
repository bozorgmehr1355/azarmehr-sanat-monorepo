-- ============================================================================
-- Supabase Storage — باکت attachments برای پیام‌رسان داخلی
-- ============================================================================
-- اجرا در: Supabase Dashboard → SQL Editor
-- ============================================================================

-- ۱. ساخت باکت (public برای دسترسی آزاد به فایل‌ها)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,              -- public: فایل‌ها با URL عمومی قابل دسترسی هستند
  10485760,          -- حداکثر ۱۰ مگابایت
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'text/plain',
    'application/zip'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ۲. پالیسی آپلود (INSERT) — هر کسی می‌تواند فایل آپلود کند
-- (محدودیت: فقط فایل‌های با حداکثر ۱۰MB در مسیر chat/)
CREATE POLICY "allow_upload_attachments"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = 'chat'
  AND octet_length(coalesce(string_to_array(name, '/')::text, name)) < 500
);

-- ۳. پالیسی دانلود (SELECT) — هر کسی می‌تواند دانلود کند
CREATE POLICY "allow_read_attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- ۴. پالیسی حذف (DELETE) — فقط فایل‌های chat قابل حذف هستند
CREATE POLICY "allow_delete_attachments"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = 'chat');
