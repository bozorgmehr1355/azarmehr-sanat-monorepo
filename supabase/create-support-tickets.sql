-- ============================================================
-- create-support-tickets.sql
-- Source of Truth: supabase/ (per docs/PROJECT_MAP.md §database source)
-- ============================================================
-- ⚠️ این فایل فقط SCHEMA را تعریف می‌کند.
-- ⚠️ اجرای این migration نیازمند approval جداگانهٔ مالک است و در این مرحله اجرا نشده است.
-- ⚠️ backend (backend/handlers/support-tickets.js) هنوز باید با قرارداد
--    docs/SERVICE_CONTRACTS.md (Support Tickets API Contract) تطبیق داده شود
--    (افزودن GET ادمین و PATCH ادمین؛ POST فعلی 503 کنترل‌شده برمی‌گرداند).
-- ⚠️ اگر الگوی admin RLS قطعی نبود، در commentهای پایین توضیح داده شده.
--    (در این repo الگوی قطعی وجود دارد: auth.jwt() ->> 'system_role' IN ('super_admin','admin'))
-- ============================================================

-- ─── ۱. جدول ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- هویت مشتری/کاربر؛ از توکن استخراج می‌شود (backend requireAuth -> user.id)
  -- نکته: قرارداد SERVICE_CONTRACTS.md از نام customer_id در UI یاد می‌کند،
  -- اما handler فعلی user.id را می‌خواند؛ طبق دستور صریح این مرحله user_id استفاده شد.
  -- FK قطعی به users/profiles/customers در SoT موجود نیست => FK اضافه نشد.
  user_id      uuid NOT NULL,

  subject      text NOT NULL,
  description  text NOT NULL,

  -- statusهای مجاز طبق admin-panel STATUS_MAP (تأیید شده در قرارداد)
  status       text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),

  -- یادداشت/پاسخ ادمین (تأیید شده در admin-panel saveDetail: admin_notes)
  admin_notes  text,

  created_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at   timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.support_tickets IS
  'Support tickets. Schema-only migration; NOT executed yet. Admin RLS uses auth.jwt() ->> ''system_role'' IN (''super_admin'',''admin'').';
COMMENT ON COLUMN public.support_tickets.user_id IS
  'Owner identity from auth token (backend extracts user.id). No FK: no confirmed users-table SoT.';
COMMENT ON COLUMN public.support_tickets.subject IS 'Ticket subject; non-empty enforced by CHECK via backend + NOT NULL.';
COMMENT ON COLUMN public.support_tickets.description IS 'Ticket body/message; non-empty enforced by backend + NOT NULL.';
COMMENT ON COLUMN public.support_tickets.status IS
  'Lifecycle: open | in_progress | resolved | closed (from admin-panel STATUS_MAP).';
COMMENT ON COLUMN public.support_tickets.admin_notes IS 'Admin reply/note; nullable; written via PATCH (admin only).';

-- ─── ۲. updated_at trigger (self-contained helper) ──────────
-- تابع public.update_updated_at_column() اینجا به‌صورت idempotent تعریف می‌شود
-- تا migration روی هر محیطی (از جمله staging که آن تابع را ندارد) مستقل اجرا شود.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── ۳. Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx  ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx    ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_created_idx   ON public.support_tickets (created_at DESC);

-- ─── ۴. RLS ───────────────────────────────────────────────
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- مشتری: فقط insert تیکت متعلق به خودش (user_id = auth.uid())
-- backend نیز هویت را از توکن می‌گیرد و اجازه نمی‌دهد body مالک را تعیین کند.
DROP POLICY IF EXISTS support_tickets_customer_insert ON public.support_tickets;
CREATE POLICY "support_tickets_customer_insert" ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- مشتری: فقط مشاهدهٔ تیکت‌های خودش (قرارداد فقط customer POST را قطعی کرده؛
-- اما owner-read طبق اصل "مشتری فقط تیکت خودش" مجاز است).
DROP POLICY IF EXISTS support_tickets_customer_select ON public.support_tickets;
CREATE POLICY "support_tickets_customer_select" ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- ادمین: دسترسی کامل (الگوی قطعی پروژه: auth.jwt() ->> 'system_role')
DROP POLICY IF EXISTS support_tickets_admin_all ON public.support_tickets;
CREATE POLICY "support_tickets_admin_all" ON public.support_tickets
  FOR ALL
  USING (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'))
  WITH CHECK (auth.jwt() ->> 'system_role' IN ('super_admin', 'admin'));
