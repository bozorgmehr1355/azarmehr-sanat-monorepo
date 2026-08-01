-- ============================================================
-- Migration: رصد زمان انجام کار و دلیل توقف تسک‌ها
--   * crm_order_tasks.status: اضافه شدن وضعیت‌های blocked و returned
--   * ستون‌های جدید: started_at (شروع کار) و stopped_reason (دلیل توقف)
--   * جدول crm_order_status_log (از قبل موجود است) ← افزودن ستون‌های
--     task_id / stage / reason برای رصد تاریخچه اختصاصی تسک‌ها
--
-- ⚠️ جدول crm_order_status_log قبلاً در دیتابیس ساخته شده و هندلر
--    crm-order-status-log.js (GET/POST) روی آن mount است؛ بنابراین اینجا
--    CREATE TABLE نمی‌زنیم و فقط ستون‌های موردنیاز را اضافه می‌کنیم.
-- ============================================================

-- ─── ۱) توسعه CHECK وضعیت‌های تسک ────────────────────────────────────────────
ALTER TABLE public.crm_order_tasks
  DROP CONSTRAINT IF EXISTS crm_order_tasks_status_check;

ALTER TABLE public.crm_order_tasks
  ADD CONSTRAINT crm_order_tasks_status_check
  CHECK (status IN ('pending', 'done', 'rejected', 'blocked', 'returned'));

-- ─── ۲) ستون‌های رصد زمان و دلیل توقف ────────────────────────────────────────
ALTER TABLE public.crm_order_tasks
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.crm_order_tasks
  ADD COLUMN IF NOT EXISTS stopped_reason TEXT;

-- ─── ۳) تکمیل جدول تاریخچه تغییر وضعیت (از قبل موجود) ────────────────────────
ALTER TABLE public.crm_order_status_log
  ADD COLUMN IF NOT EXISTS task_id BIGINT;

ALTER TABLE public.crm_order_status_log
  ADD COLUMN IF NOT EXISTS stage TEXT;

ALTER TABLE public.crm_order_status_log
  ADD COLUMN IF NOT EXISTS reason TEXT;

-- ایندکس‌ها
CREATE INDEX IF NOT EXISTS idx_crm_order_status_log_task   ON public.crm_order_status_log(task_id);
CREATE INDEX IF NOT EXISTS idx_crm_order_status_log_order  ON public.crm_order_status_log(order_id, created_at);

-- (RLS عمداً فعال نشده؛ بک‌اند با service role کار می‌کند که از RLS عبور می‌کند)
