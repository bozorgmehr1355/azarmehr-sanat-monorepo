-- Migration: 20260731000002_grant_phase1_tables.sql
-- تاریخ: ۲۰۲۶-۰۷-۳۱
-- Phase 1 — اعطای دسترسی جداول فاز ۱ به نقش service_role
--
-- چرا: جداول فاز ۱ (tasks, task_evidences, meeting_minutes, audit_logs, ai_drafts)
-- بدون GRANT ساخته شده‌اند و PostgREST حتی برای service_role هم دسترسی نمی‌دهد.
-- بک‌اند (backend/handlers/*) با service_role کار می‌کند.
--
-- ⚠️ امنیت: عمداً به anon / authenticated دسترسی داده نمی‌شود چون RLS در این
-- جداول غیرفعال است؛ در صورت نیاز به دسترسی مستقیم کلاینت، ابتدا RLS فعال و
-- سپس سیاست‌ها (policies) تعریف شود.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_evidences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_minutes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_drafts TO service_role;
