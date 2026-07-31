-- Migration: 20260731000003_enable_rls_phase1.sql
-- تاریخ: ۲۰۲۶-۰۷-۳۱
-- Phase 1 — فعال‌سازی Row Level Security روی جداول فاز ۱
--
-- چرا: RLS روی جداول فاز ۱ غیرفعال بود؛ در نتیجه هر نقشی که GRANT داشته باشد
-- به تمام ردیف‌ها دسترسی پیدا می‌کند. فعال‌سازی RLS به‌عنوان لایه دفاع دوم
-- تضمین می‌کند که حتی با GRANT‌های آینده هم هیچ کلاینتی به ردیف‌ها دسترسی نداشته باشد.
--
-- استراتژی (deny-by-default):
--   - هیچ policy تعریف نمی‌شود؛ بنابراین نقش‌های بدون BYPASSRLS
--     (anon و authenticated) حتی با GRANT هم ردیفی را نمی‌بینند.
--   - بک‌اند (backend/handlers/*) با service_role کار می‌کند که BYPASSRLS دارد
--     و بدون هیچ تغییری به کار خود ادامه می‌دهد.
--   - اگر در آینده کلاینتی مستقیم (پنل ادمین / پیام‌رسان) به این جداول نیاز داشت،
--     ابتدا policy مناسب تعریف شود و سپس GRANT حداقلی داده شود.
--
-- ⚠️ جداول سرویس‌های دیگر (matching، پیام‌رسان و...) دست‌نخورده باقی می‌مانند.

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_drafts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tasks IS 'فاز ۱ — RLS فعال (deny-all). دسترسی فقط از طریق بک‌اند با service_role.';
COMMENT ON TABLE public.task_evidences IS 'فاز ۱ — RLS فعال (deny-all). دسترسی فقط از طریق بک‌اند با service_role.';
COMMENT ON TABLE public.meeting_minutes IS 'فاز ۱ — RLS فعال (deny-all). دسترسی فقط از طریق بک‌اند با service_role.';
COMMENT ON TABLE public.audit_logs IS 'فاز ۱ — RLS فعال (deny-all). دسترسی فقط از طریق بک‌اند با service_role.';
COMMENT ON TABLE public.ai_drafts IS 'فاز ۱ — RLS فعال (deny-all). دسترسی فقط از طریق بک‌اند با service_role.';
