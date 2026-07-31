-- ============================================================
-- Migration: crm_order_tasks (مراحل کاری سفارشات)
-- جدول اختصاصی مراحل ۸ گانه و ثابتِ سفارش (نتیجه تبدیل سفارش به پروژه).
-- ⚠️ این جدول در دیتابیس پروداکشن وجود نداشت و منجر به خطای
--    "Could not find the table 'public.crm_order_tasks' in the schema cache"
--    هنگام فراخوانی /api/crm-order-to-project می‌شد.
--    این مایگریشن باید در Supabase Dashboard → SQL Editor اجرا شود.
--
-- منطق جداول (تصمیم معماری):
--   * crm_order_tasks : فقط مراحل ثابت سفارش (پیشرفت workflow_status در
--     crm-order-tasks.js بر اساس همین جدول است)
--   * project_tasks   : صرفاً تسک‌های عمومی/متغیر/دستی پروژه‌ها
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_order_tasks (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,           -- crm_orders.id (عدد) — FK عمداً حذف شد تا با نوع ستون زنده سازگار بماند
  stage TEXT NOT NULL,                -- sales_review / proforma_pending / ... / shipping
  assignee TEXT NOT NULL,             -- ardestani / dolatkhah / customer / hosseini / serajeddin / moradi
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'rejected')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,  -- action، payment_type، order_workflow_status، notes
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ایندکس‌ها
CREATE INDEX IF NOT EXISTS idx_crm_order_tasks_order ON public.crm_order_tasks(order_id, order_index);
CREATE INDEX IF NOT EXISTS idx_crm_order_tasks_stage ON public.crm_order_tasks(stage);
CREATE INDEX IF NOT EXISTS idx_crm_order_tasks_assignee ON public.crm_order_tasks(assignee);

-- (RLS عمداً فعال نشده؛ بک‌اند با service role کار می‌کند که از RLS عبور می‌کند)
