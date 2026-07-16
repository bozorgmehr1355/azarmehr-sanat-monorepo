-- ============================================================================
-- create-performance-scores.sql
-- جدول امتیاز عملکرد (performance_scores)
--
-- هدف: ذخیرهٔ نتیجهٔ محاسبه از endpoint جدید
--       POST /api/reports/performance/calculate
--
-- ⚠️ این فایل یک پیش‌نویس (proposed) است و توسط PawWork اجرا نشده است.
--    برای اعمال: محتوای این فایل را در Supabase Dashboard → SQL Editor
--    کپی کرده و اجرا (Run) کنید.
--
-- 🔐 نکته امنیتی:
--    کلاینت backend با SERVICE_ROLE کار می‌کند (مقدار SUPABASE_SERVICE_ROLE_KEY)
--    که RLS را دور می‌زند؛ بنابراین محدودسازی دسترسی نوشتن در سطح اپلیکیشن
--    و با requireSuperAdmin(req) اعمال می‌شود. سیاست‌های RLS زیر صرفاً
--    دفاع در عمق و سازگار با سایر جداول هستند (اگر روزی با کلید anon فراخوانی شود).
-- ============================================================================

-- ─── ۱. ساخت جدول (idempotent) ───
CREATE TABLE IF NOT EXISTS performance_scores (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      uuid        NOT NULL,  -- FK به users حذف شد: اجرای اولیه با خطای ۴۲۸۰۹ شکست خورد (افزودن FK به view در PostgreSQL مجاز نیست). user_id همچنان NOT NULL؛ اعتبار user در application/auth layer چک می‌شود
  start_date                   date        NOT NULL,
  end_date                     date        NOT NULL,
  total_tasks                  integer     NOT NULL DEFAULT 0,
  completed_tasks              integer     NOT NULL DEFAULT 0,
  avg_completion_time_hours    numeric,
  quality_score                numeric,
  raw_data                     jsonb,
  computed_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT performance_scores_dates_check CHECK (end_date >= start_date),
  -- کلید one-row-per-(user,range) برای upsert از سمت handler
  CONSTRAINT performance_scores_uq UNIQUE (user_id, start_date, end_date)
);

COMMENT ON TABLE performance_scores IS
  'امتیاز عملکرد کاربران بر اساس tasks در یک بازه زمانی؛ خروجی /api/reports/performance/calculate';

-- ─── ۲. ایندکس (idempotent) ───
CREATE INDEX IF NOT EXISTS idx_performance_scores_user
  ON performance_scores (user_id);

-- ─── ۳. RLS (دفاع در عمق) ───
ALTER TABLE performance_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'performance_scores'
      AND policyname = 'performance_scores_admin_all'
  ) THEN
    CREATE POLICY "performance_scores_admin_all" ON performance_scores
      FOR ALL
      USING     (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'))
      WITH CHECK (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));
  END IF;
END $$;
