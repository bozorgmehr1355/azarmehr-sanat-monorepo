-- ============================================================
-- Migration: ساخت جدول crm_order_history (تاریخچه سفارش‌ها)
-- ----------------------------------------------------------------------------
-- بک‌اند در سه نقطه به این جدول insert می‌کند (crm-order-tasks.js و
-- crm-order-to-project.js) اما جدول در دیتابیس وجود نداشت و خطاها بی‌صدا
-- بلعیده می‌شدند. این migration جدول را با ستون‌های مورد استفادهٔ بک‌اند
-- می‌سازد. Idempotent است.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_order_history (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL,
  from_status TEXT,
  to_status   TEXT,
  changed_by  TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ایندکس‌ها برای جستجوی تاریخچهٔ یک سفارش
CREATE INDEX IF NOT EXISTS idx_crm_order_history_order
  ON public.crm_order_history (order_id, created_at);

-- (RLS عمداً فعال نشده؛ بک‌اند با service role کار می‌کند که از RLS عبور می‌کند)
