-- ============================================================================
-- Migration: تفکیک چرخه حیات سفارش (خرده / عمده)
-- ----------------------------------------------------------------------------
-- ۱) order_type به مقادیر retail/wholesale محدود می‌شود (فعلاً DEFAULT 'stock'
--    بود که هیچ‌جا استفاده نمی‌شد).
-- ۲) ردیف‌های موجود بر اساس sales_channel backfill می‌شوند.
-- ۳) تریگر همگام‌سازی دوطرفه order_type ↔ sales_channel:
--    * اگر order_type نامعتبر/خالی باشد از sales_channel گرفته می‌شود
--    * اگر sales_channel خالی باشد از order_type گرفته می‌شود
--    → هر مسیر ثبت سفارش (پنل، پورتال، واتساپ) بدون کد اضافه همگام می‌ماند.
-- Idempotent است و می‌توان چند بار اجرا کرد.
-- ============================================================================

-- ─── ۱) محدود کردن مقادیر order_type به retail/wholesale ────────────────────
-- backfill ردیف‌های موجود (stock یا NULL → بر اساس sales_channel)
UPDATE public.crm_orders
   SET order_type = CASE WHEN sales_channel = 'retail' THEN 'retail' ELSE 'wholesale' END
 WHERE order_type IS NULL OR order_type NOT IN ('retail', 'wholesale');

-- DEFAULT جدید
ALTER TABLE public.crm_orders
  ALTER COLUMN order_type SET DEFAULT 'wholesale';

-- CHECK constraint (قبلی را اگر هست حذف کن)
ALTER TABLE public.crm_orders DROP CONSTRAINT IF EXISTS crm_orders_order_type_check;
ALTER TABLE public.crm_orders
  ADD CONSTRAINT crm_orders_order_type_check CHECK (order_type IN ('retail', 'wholesale'));

-- ─── ۲) تابع و تریگر همگام‌سازی دوطرفه ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_order_type()
RETURNS TRIGGER AS $$
BEGIN
  -- اگر order_type خالی/نامعتبر بود → از sales_channel
  IF NEW.order_type IS NULL OR NEW.order_type NOT IN ('retail', 'wholesale') THEN
    NEW.order_type := CASE WHEN NEW.sales_channel = 'retail' THEN 'retail' ELSE 'wholesale' END;
  END IF;
  -- اگر sales_channel خالی بود → از order_type
  IF NEW.sales_channel IS NULL OR NEW.sales_channel NOT IN ('retail', 'wholesale') THEN
    NEW.sales_channel := NEW.order_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_orders_sync_order_type ON public.crm_orders;
CREATE TRIGGER trg_crm_orders_sync_order_type
  BEFORE INSERT OR UPDATE ON public.crm_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_type();
