-- ============================================================================
-- Supabase Schema — WhatsApp AI Agent Tables
-- پروژه: آذرمهر صنعت — Supabase (apscmdspkitpwzhizgkq.supabase.co)
--
-- ۲ جدول:
--   1. whatsapp_rules   — قوانین هوشمند ایجنت (قیمت‌گذاری، موجودی، ...)
--   2. whatsapp_logs    — ثبت تمام تراکنش‌های ایجنت
-- ============================================================================

-- ============================================================================
-- 1. whatsapp_rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_rules (
  id              BIGSERIAL    PRIMARY KEY,
  condition_type  VARCHAR      NOT NULL,             -- pricing_logic, stock_check, greeting, fallback
  condition_value JSONB        NOT NULL DEFAULT '{}',
  status          VARCHAR      NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  priority        INT          NOT NULL DEFAULT 0,
  description     TEXT         DEFAULT '',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  whatsapp_rules              IS 'قوانین هوشمند ایجنت واتساپ';
COMMENT ON COLUMN whatsapp_rules.condition_type  IS 'نوع قانون: pricing_logic, stock_check, greeting, fallback';
COMMENT ON COLUMN whatsapp_rules.condition_value IS 'JSONB شامل جزئیات شرط';
COMMENT ON COLUMN whatsapp_rules.status          IS 'active=فعال, inactive=غیرفعال';
COMMENT ON COLUMN whatsapp_rules.priority        IS 'اولویت اجرا (عدد کمتر = بالاتر)';
COMMENT ON COLUMN whatsapp_rules.description     IS 'توضیح فارسی برای مدیر سیستم';

CREATE INDEX IF NOT EXISTS idx_whatsapp_rules_status ON whatsapp_rules(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_rules_type   ON whatsapp_rules(condition_type);

-- ============================================================================
-- 2. whatsapp_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id                BIGSERIAL    PRIMARY KEY,
  customer_phone    VARCHAR      DEFAULT '',
  prompt_sent       TEXT         DEFAULT '',
  response_sent     TEXT         DEFAULT '',
  applied_rule_id   BIGINT       REFERENCES whatsapp_rules(id) ON DELETE SET NULL,
  customer_grade    VARCHAR      DEFAULT '',
  matched_products  JSONB        DEFAULT '[]'::jsonb,
  status            VARCHAR      NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message     TEXT         DEFAULT '',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  whatsapp_logs              IS 'ثبت تراکنش‌های AI Agent واتساپ';
COMMENT ON COLUMN whatsapp_logs.customer_phone   IS 'شماره تلفن مشتری';
COMMENT ON COLUMN whatsapp_logs.prompt_sent      IS 'متن درخواست ارسال شده به Agent';
COMMENT ON COLUMN whatsapp_logs.response_sent    IS 'پاسخ تولید شده توسط Agent';
COMMENT ON COLUMN whatsapp_logs.applied_rule_id  IS 'FK → whatsapp_rules.id';
COMMENT ON COLUMN whatsapp_logs.customer_grade   IS 'سطح مشتری (standard/silver/gold/vip)';
COMMENT ON COLUMN whatsapp_logs.matched_products IS 'محصولات منطبق شده به صورت JSONB';
COMMENT ON COLUMN whatsapp_logs.status           IS 'success=موفق, error=خطا';
COMMENT ON COLUMN whatsapp_logs.error_message    IS 'پیام خطا';

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone    ON whatsapp_logs(customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status   ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created  ON whatsapp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_rule     ON whatsapp_logs(applied_rule_id);

-- ============================================================================
-- 3. Seed data: قوانین پیش‌فرض
-- ============================================================================
INSERT INTO whatsapp_rules (condition_type, condition_value, status, priority, description)
VALUES (
  'pricing_logic',
  '{
    "grade_mapping": {
      "standard": "price_standard",
      "silver": "price_silver",
      "gold": "price_gold",
      "vip": "price_vip"
    },
    "default_grade": "standard",
    "fallback_field": "base_price",
    "show_stock": true,
    "show_packaging": true
  }',
  'active',
  1,
  'قانون پیش‌فرض: نمایش قیمت بر اساس سطح مشتری'
) ON CONFLICT DO NOTHING;

INSERT INTO whatsapp_rules (condition_type, condition_value, status, priority, description)
VALUES (
  'stock_check',
  '{
    "out_of_stock_threshold": 0,
    "low_stock_threshold": 10,
    "low_stock_message": "⚠️ موجودی محدود",
    "out_of_stock_message": "❌ در حال حاضر موجود نیست"
  }',
  'active',
  2,
  'قانون پیش‌فرض: بررسی موجودی انبار'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. warranty_returns — درخواست‌های گارانتی و مرجوعی
-- ============================================================================
CREATE TABLE IF NOT EXISTS warranty_returns (
  id                BIGSERIAL    PRIMARY KEY,
  customer_phone    VARCHAR      NOT NULL DEFAULT '',
  customer_name     VARCHAR      NOT NULL DEFAULT '',
  customer_address  TEXT         DEFAULT '',
  product_code      VARCHAR      DEFAULT '',
  reason            TEXT         DEFAULT '',
  status            VARCHAR      NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  source            VARCHAR      NOT NULL DEFAULT 'whatsapp',
  admin_notes       TEXT         DEFAULT '',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  warranty_returns               IS 'درخواست‌های گارانتی و مرجوعی مشتریان';
COMMENT ON COLUMN warranty_returns.customer_phone   IS 'شماره تلفن مشتری';
COMMENT ON COLUMN warranty_returns.customer_name    IS 'نام و نام‌خانوادگی';
COMMENT ON COLUMN warranty_returns.customer_address IS 'آدرس کامل برای مرجوعی';
COMMENT ON COLUMN warranty_returns.product_code     IS 'کد محصول';
COMMENT ON COLUMN warranty_returns.reason           IS 'علت مرجوعی (تلخ، بی‌مزه، رنگ، بو و ...)';
COMMENT ON COLUMN warranty_returns.status           IS 'pending=جدید, processing=درحال پیگیری, completed=انجام‌شده, rejected=ردشده';
COMMENT ON COLUMN warranty_returns.source           IS 'whatsapp, admin, portal';
COMMENT ON COLUMN warranty_returns.admin_notes      IS 'یادداشت مدیر';

CREATE INDEX IF NOT EXISTS idx_warranty_returns_phone   ON warranty_returns(customer_phone);
CREATE INDEX IF NOT EXISTS idx_warranty_returns_status  ON warranty_returns(status);
CREATE INDEX IF NOT EXISTS idx_warranty_returns_created ON warranty_returns(created_at DESC);

-- ============================================================================
-- 5. order_requests — درخواست‌های خرید مشتریان از واتساپ
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_requests (
  id                BIGSERIAL    PRIMARY KEY,
  customer_phone    VARCHAR      NOT NULL DEFAULT '',
  customer_name     VARCHAR      NOT NULL DEFAULT '',
  customer_type     VARCHAR      NOT NULL DEFAULT 'unknown' CHECK (customer_type IN ('wholesale', 'retail', 'unknown')),
  product_interest  TEXT         DEFAULT '',
  message_text      TEXT         DEFAULT '',
  status            VARCHAR      NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  source            VARCHAR      NOT NULL DEFAULT 'whatsapp',
  admin_notes       TEXT         DEFAULT '',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  order_requests                 IS 'درخواست‌های خرید و لیدهای فروش از واتساپ';
COMMENT ON COLUMN order_requests.customer_phone    IS 'شماره تلفن مشتری';
COMMENT ON COLUMN order_requests.customer_name     IS 'نام مشتری (در صورت تشخیص)';
COMMENT ON COLUMN order_requests.customer_type     IS 'wholesale=عمده, retail=خرده, unknown=نامشخص';
COMMENT ON COLUMN order_requests.product_interest  IS 'محصولات مورد علاقه (متن آزاد)';
COMMENT ON COLUMN order_requests.message_text      IS 'متن پیام مشتری';
COMMENT ON COLUMN order_requests.status            IS 'new=جدید, contacted=تماس گرفته شده, converted=تبدیل به فروش, closed=بسته شده';
COMMENT ON COLUMN order_requests.source            IS 'whatsapp, portal, admin';
COMMENT ON COLUMN order_requests.admin_notes       IS 'یادداشت مدیر';

CREATE INDEX IF NOT EXISTS idx_order_requests_phone   ON order_requests(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_requests_type    ON order_requests(customer_type);
CREATE INDEX IF NOT EXISTS idx_order_requests_status  ON order_requests(status);
CREATE INDEX IF NOT EXISTS idx_order_requests_created ON order_requests(created_at DESC);
