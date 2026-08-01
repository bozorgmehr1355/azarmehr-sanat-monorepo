-- ============================================================================
-- شماره‌گذاری خودکار مشتریان و سفارش‌ها (بدون Race Condition)
-- ----------------------------------------------------------------------------
-- customer_code : CUST-00001            → crm_customers.customer_code
-- tracking_code : ORD-202607-0001       → crm_orders.tracking_code
--
-- روش ضد Race: کد از سیکوئنس دیتابیس (nextval) با مقدار پیش‌فرض ستون تولید می‌شود.
-- nextval اتمیک است → دو درخواست هم‌زمان هرگز کد تکراری نمی‌گیرند.
-- این فایل idempotent است و می‌توان آن را چند بار اجرا کرد.
--
-- ⚠️ نکته مهم (ردیف‌های موجود):
--    backfill فقط ردیف‌های NULL را پر می‌کند؛ کدهای دستی/قدیمی دست‌نخورده می‌مانند.
--    پس از backfill، سیکوئنس با setval به بزرگ‌ترین عدد موجود می‌رسد تا اجرای
--    مجدد یا کدهای دستی قبلی، تداخلی با کدهای بعدی ایجاد نکنند.
-- ============================================================================

-- ─── ۰) شروع امن: اگر جداول وجود ندارند خطا می‌دهد (انتظار می‌رود موجود باشند) ──

-- ─── ۱) سیکوئنس‌ها ──────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.customer_code_seq  START 1;
CREATE SEQUENCE IF NOT EXISTS public.order_tracking_seq START 1;

-- ─── ۲) crm_customers.customer_code ──────────────────────────────────────────
ALTER TABLE public.crm_customers
  ADD COLUMN IF NOT EXISTS customer_code text;

ALTER TABLE public.crm_customers
  ALTER COLUMN customer_code
  SET DEFAULT ('CUST-' || LPAD(nextval('public.customer_code_seq')::text, 5, '0'));

-- backfill ردیف‌های موجود (فقط ردیف‌های بدون کد)
UPDATE public.crm_customers
   SET customer_code = 'CUST-' || LPAD(nextval('public.customer_code_seq')::text, 5, '0')
 WHERE customer_code IS NULL;

-- همگام‌سازی سیکوئنس با بزرگ‌ترین عدد موجود (اجرای مجدد امن)
SELECT setval('public.customer_code_seq',
  GREATEST(
    (SELECT COALESCE(MAX((regexp_match(customer_code, '^CUST-([0-9]+)$'))[1]::bigint), 0)
       FROM public.crm_customers
      WHERE customer_code ~ '^CUST-[0-9]+$'),
    COALESCE((SELECT last_value FROM public.customer_code_seq), 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_customers_customer_code
  ON public.crm_customers (customer_code);

-- ─── ۳) crm_orders.tracking_code ─────────────────────────────────────────────
ALTER TABLE public.crm_orders
  ADD COLUMN IF NOT EXISTS tracking_code text;

ALTER TABLE public.crm_orders
  ALTER COLUMN tracking_code
  SET DEFAULT ('ORD-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(nextval('public.order_tracking_seq')::text, 4, '0'));

-- backfill ردیف‌های موجود (فقط ردیف‌های بدون کد)
UPDATE public.crm_orders
   SET tracking_code = 'ORD-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(nextval('public.order_tracking_seq')::text, 4, '0')
 WHERE tracking_code IS NULL;

-- همگام‌سازی سیکوئنس با بزرگ‌ترین عدد موجود (اجرای مجدد امن)
SELECT setval('public.order_tracking_seq',
  GREATEST(
    (SELECT COALESCE(MAX((regexp_match(tracking_code, '^ORD-[0-9]{6}-([0-9]+)$'))[1]::bigint), 0)
       FROM public.crm_orders
      WHERE tracking_code ~ '^ORD-[0-9]{6}-[0-9]+$'),
    COALESCE((SELECT last_value FROM public.order_tracking_seq), 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_orders_tracking_code
  ON public.crm_orders (tracking_code);

-- ─── ۴) خروجی تأیید ─────────────────────────────────────────────────────────
DO $$
DECLARE
  cust_count   bigint;
  order_count  bigint;
BEGIN
  SELECT COUNT(*) INTO cust_count  FROM public.crm_customers WHERE customer_code IS NOT NULL;
  SELECT COUNT(*) INTO order_count FROM public.crm_orders     WHERE tracking_code IS NOT NULL;
  RAISE NOTICE 'crm_customers با کد: % | crm_orders با کد: %', cust_count, order_count;
END $$;
