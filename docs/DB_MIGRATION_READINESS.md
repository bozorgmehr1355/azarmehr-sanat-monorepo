# DB Migration Readiness & RLS Verification — Project Control / Reporting

> بررسی آمادگی migrationها و وضعیت RLS برای ماژول‌های **Project Control** و **Performance/Reports**.
> ⚠️ هیچ migrationی در این تسک **اجرا نشده** و هیچ SQL روی Supabase live **اجرا نشده** است.
> ⚠️ URL ممنوعه `azarmehr-backend-main.vercel.app` استفاده نشده است.

هدف: مشخص کردن کدام migration آمادهٔ اجراست، ریسک هر کدام، کدام policyها missing هستند،
و قبل/بعد اجرا چه verification queryهایی لازم است.

---

## A) Migration Inventory

| # | File | Purpose | Objects | Idempotent | Deps | Risk | Run once | Rerun | Rollback |
|---|------|---------|---------|-----------|------|------|----------|-------|----------|
| 1 | `supabase/create-projects-tasks.sql` | ساخت projects, project_members, project_tasks, task_status_history, task_attachments | ۵ جدول (`CREATE TABLE IF NOT EXISTS`) | YES | — | LOW | YES | YES | DROP TABLE (مخرب) |
| 2 | `supabase/create-task-progress-blockers.sql` | ساخت task_progress_updates, task_blockers | ۲ جدول (`IF NOT EXISTS`) | YES | — | LOW | YES | YES | DROP TABLE (مخرب) |
| 3 | `supabase/create-meetings-ai-audit.sql` | ساخت meetings, meeting_action_items, ai_drafts, audit_logs | ۴ جدول (`IF NOT EXISTS`) | YES | — | LOW | YES | YES | DROP TABLE (مخرب) |
| 4 | `supabase/fix-missing-columns.sql` | اضافه کردن creator_id, scheduled_at, meeting_type, notes, created_by, resolved | ۶ `ADD COLUMN IF NOT EXISTS` | YES | بعد از ۱/۲/۳ | LOW | YES | YES | DROP COLUMN (مخرب) |
| 5 | `supabase/fix-project-tasks-status-lifecycle.sql` | اضافه completed_at + normalize pending→ASSIGNED + DEFAULT + CHECK(۱۳ وضعیت) + index + comment | ۱ ستون، ۱ UPDATE، ۱ CONSTRAINT، ۱ INDEX | YES (DROP قبل ADD) | بعد از ۱ | **MEDIUM** | YES* | YES* | DROP COLUMN/CONSTRAINT (ریسک متوسط) |
| 6 | `supabase/add-reporting-indexes.sql` | indexهای performance برای گزارش‌ها | ۱۸ `CREATE INDEX IF NOT EXISTS` | YES | بعد از ۱/۲/۳/۴ | LOW | YES | YES | DROP INDEX |
| 7 | `supabase/rls-policies.sql` | ENABLE RLS روی ۱۲ جدول + ۸ CREATE POLICY | RLS + ۸ policy | YES (DO block drop-first) | بعد از ۱/۲/۳ | LOW | YES | YES | DROP POLICY / DISABLE RLS (توصیه نمی‌شود) |
| 8 | `supabase/rls-policies-project-control-addendum.sql` (**اجرا شده توسط مالک در Dashboard**) | ۳ policy گم‌شده برای task_progress_updates, task_blockers, meeting_action_items | ۶ policy | YES (DROP POLICY IF EXISTS) | بعد از ۷ | LOW | YES | YES | DROP POLICY |

\* `fix-project-tasks-status-lifecycle.sql` روی rerun ایمن است چون `DROP CONSTRAINT IF EXISTS` قبل از
`ADD CONSTRAINT` اجرا می‌شود. ریسک MEDIUM به دلیل: (الف) `ADD CONSTRAINT` اگر هر `status` خارج از ۱۳
وضعیت رسمی وجود داشته باشد **خطا می‌دهد** (با pre-check شماره ۵ قابل پیش‌گیری)؛ (ب) `UPDATE` داده را
موتیت می‌کند (pending→ASSIGNED؛ اگر قبلاً نرمال‌سازی شده باشد بی‌اثر است).

---

## B) RLS Matrix

| Table | RLS enabled | Policies | Expected access | Backend (service-role) | Frontend direct Supabase | Gap |
|-------|------------|----------|-----------------|------------------------|--------------------------|-----|
| projects | YES | projects_admin_all, projects_member_read | admin=all, member=read | unaffected | denied (no anon path) | — |
| project_members | YES | pm_admin_all, pm_user_read | admin=all, owner=read | unaffected | denied | — |
| project_tasks | YES | tasks_admin_all, tasks_member_read, tasks_assignee_update | admin=all, member=read, assignee=update | unaffected | denied | — |
| task_status_history | YES | task_children_read | member/creator=read | unaffected | denied | — |
| task_attachments | YES | task_children_read_2 | member/creator=read | unaffected | denied | — |
| **task_progress_updates** | YES | **tpu_admin_all, tpu_children_read** | admin=all, member/creator=read | unaffected | denied (no anon path) | **RESOLVED** |
| **task_blockers** | YES | **tb_admin_all, tb_children_read** | admin=all, member/creator=read | unaffected | denied (no anon path) | **RESOLVED** |
| meetings | YES | meetings_admin_all, meetings_member_read | admin=all, member=read | unaffected | denied | — |
| **meeting_action_items** | YES | **mai_admin_all, mai_member_read** | admin=all, member=read | unaffected | denied (no anon path) | **RESOLVED** |
| ai_drafts | YES | ai_drafts_owner | owner=all | unaffected | denied | — |
| audit_logs | YES | audit_logs_admin | admin=read | unaffected | denied | — |

**تعداد gap: ۰ جدول unresolved** (task_progress_updates, task_blockers, meeting_action_items → RESOLVED).
**شدت gap قبلی: LOW.** این gap «fail-closed» RLS بود (ناسازگار با بقیه جداول). اکنون با اجرای دستی
addendum در Supabase Dashboard توسط مالک و تأیید خروجی `pg_policies`، وضعیت **RESOLVED** است.
**منبع تأیید:** خروجی `pg_policies` ارائه‌شده توسط مالک روی پروژه `apscmdspkitpwzhizgkq` (۶ policy مشاهده شدند).
**policyهای تأییدشده:**
- task_progress_updates: tpu_admin_all, tpu_children_read
- task_blockers: tb_admin_all, tb_children_read
- meeting_action_items: mai_admin_all, mai_member_read

> نکته: بک‌اند از service-role استفاده می‌کند (RLS را دور می‌زند) و admin-panel از پراکسی بک‌اند استفاده
> می‌کند → هیچ مسیر زنده‌ای نمی‌شکند. این تغییر صرفاً همسوسازی fail-closed با بقیه جداول است.

---

## C) completed_at Readiness

- **Migration آماده است؟** بله — `fix-project-tasks-status-lifecycle.sql` idempotent و خوانا است.
- **بک‌اند واقعاً به آن نیاز دارد؟** فقط `project-tasks.js` (می‌نویسد). `reports.js` **استفاده نمی‌کند**.
- **نبودش کدام route را می‌شکند؟** هر انتقال وضعیت در `project-tasks.js` که `completed_at` را ست
  می‌کند: `POST /api/project-tasks/:id/review` (APPROVED/REJECTED)، `archive`، `block`، و انتقال
  عمومی به وضعیت‌های `FINAL_WITH_COMPLETED_AT` (APPROVED/REJECTED/ARCHIVED). بدون ستون → Supabase
  update خطا → آن routeها **۵۰۰** برمی‌گردانند.
- **آیا reports به آن وابسته است؟** **خیر.** `reports.js` زمان تکمیل را از
  `task_status_history` (اولین رکورد `changed_at` با وضعیت APPROVED) محاسبه می‌کند؛ `avg_completion_time_days`
  فقط هنگام نبود رکورد APPROVED `null` است (graceful).
- **تست اسموک:** `backend/smoke-test.js` انتظار دارد review باعث پر شدن `completed_at` شود
  (خط ۲۸۹‑۲۹۶، ۳۲۹‑۳۳۱) و BLOCKED باعث `null` شود (خط ۳۵۸‑۳۶۵) → بدون migration، اسموک fail می‌دهد.

**نتیجه:** اگر در prod ستون وجود نداشته باشد، زیرمسیرهای review/archive/block در Project Control
می‌شکنند. وضعیت prod **UNKNOWN** (دسترسی live نداریم) → اجرای migration توصیه می‌شود.

---

## D) Verification SQL (پیشنهادی — اجرا نشده)

### Pre-migration (قبل از اجرای migrationها)
```sql
-- 1) ستون completed_at وجود دارد؟
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'project_tasks' AND column_name = 'completed_at';

-- 2) جداول project control موجودند؟
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('projects','project_members','project_tasks','task_status_history',
                     'task_attachments','task_progress_updates','task_blockers',
                     'meetings','meeting_action_items','ai_drafts','audit_logs');

-- 3) وضعیت RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects','project_members','project_tasks','task_status_history',
                    'task_attachments','task_progress_updates','task_blockers',
                    'meetings','meeting_action_items','ai_drafts','audit_logs');

-- 4) لیست policyهای فعلی
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('projects','project_members','project_tasks','task_status_history',
                    'task_attachments','task_progress_updates','task_blockers',
                    'meetings','meeting_action_items','ai_drafts','audit_logs')
ORDER BY tablename, policyname;

-- 5) وضعیت‌های موجود در project_tasks (قبل normalization — ریسک ADD CONSTRAINT)
SELECT status, COUNT(*) FROM project_tasks GROUP BY status ORDER BY status;

-- 6) CHECK constraint فعلی روی project_tasks.status
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'project_tasks'::regclass AND contype = 'c';
```

### Post-migration (بعد از اجرای fix-lifecycle + rls-policies + addendum)
```sql
-- تکرار 1 تا 6، سپس:

-- 7) تایید completed_at پر شد برای وضعیت‌های نهایی
SELECT status,
       COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS with_completed_at,
       COUNT(*) AS total
FROM project_tasks
WHERE status IN ('APPROVED','REJECTED','ARCHIVED')
GROUP BY status;

-- 8) تایید ۳ policy جدید
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('task_progress_updates','task_blockers','meeting_action_items');

-- 9) شمارش نمونه (بدون افشای داده حساس)
SELECT COUNT(*) AS project_tasks_total FROM project_tasks;
SELECT COUNT(*) AS open_blockers FROM task_blockers WHERE status = 'OPEN';
SELECT COUNT(*) AS draft_action_items FROM meeting_action_items WHERE status = 'DRAFT';
```

---

## E) Ordering (پیشنهادی)

```
1) create-projects-tasks.sql
2) create-task-progress-blockers.sql
3) create-meetings-ai-audit.sql
4) fix-missing-columns.sql
5) fix-project-tasks-status-lifecycle.sql   ← completed_at + CHECK (ریسک MEDIUM)
6) add-reporting-indexes.sql
7) rls-policies.sql                         ← RLS + ۸ policy
8) rls-policies-project-control-addendum.sql (پیشنهادی) ← ۳ policy گم‌شده
```

⚠️ اگر `rls-policies.sql` بعداً دوباره اجرا شود، بلوک `DO` آن همهٔ policyها (از جمله addendum)
را حذف می‌کند → addendum باید **بعد** از هر اجرای مجدد rls-policies اجرا شود.

---

## F) Findings

- **Blocking:** هیچ‌کدام در محیط فعلی (بک‌اند service-role همه‌چیز را می‌بیند). اگر در prod ستون
  `completed_at` وجود نداشته باشد → زیرمسیرهای review/archive/block در Project Control ۵۰۰ می‌دهند
  (وضعیت prod UNKNOWN).
- **High:**
  - `completed_at` migration اجرا نشده → ریسک شکست routeهای FINAL_WITH_COMPLETED_AT.
  - `ADD CONSTRAINT` در migration شماره ۵ اگر `status` خارج از ۱۳ وضعیت رسمی وجود داشته باشد fail
    می‌دهد (pre-check شماره ۵ الزامی).
- **Medium:**
  - ۳ جدول project-control قبلاً فاقد RLS policy بودند (deny-all، ناسازگار) — **اکنون RESOLVED** (addendum توسط مالک در Dashboard اجرا شد و خروجی `pg_policies` تأیید کرد).
  - `add-reporting-indexes.sql` اجرا نشده (صرفاً performance؛ در حجم کوچک بی‌اثر).
- **Low:**
  - همهٔ create-/fix-missing/idnexes idempotent و LOW risk.
  - ترتیب اجرا واضح است.
- **Unknown:**
  - وضعیت واقعی prod DB (کدام migrationها قبلاً اجرا شده‌اند) — بدون دسترسی live **UNKNOWN**.
  - آیا claim `system_role` در JWT کانفیگ شده است؟ اگر نه، همهٔ policyهای مبتنی بر
    `auth.jwt() ->> 'system_role'` برای کلاینت direct ارزیابی false می‌دهند (بک‌اند تحت تأثیر نیست).

---

## G) Changes

- `docs/DB_MIGRATION_READINESS.md` ایجاد شد (این فایل) و سپس به‌روزرسانی شد (بخش RLS Matrix: ۳ gap → RESOLVED).
- `supabase/rls-policies-project-control-addendum.sql` ایجاد شد و **توسط مالک در Supabase Dashboard اجرا شد** (۶ policy؛ خروجی `pg_policies` تأیید کرد).
- `docs/PROJECT_MAP.md` به‌روزرسانی شد: ۳ gap واقعی RLS (به‌جای ۲) + ارجاع به این سند.

## H) Files not changed and why

- `supabase/rls-policies.sql`: طبق قاعده «مهاجرت موجود خطرناک/غیر idempotent را تغییر نده، بهتر
  گزارش بده» — بجای ویرایش، addendum جداگانه پیشنهاد شد.
- `supabase/fix-project-tasks-status-lifecycle.sql`: اجرا نشد (ممنوع در این تسک)؛ فقط آمادگی بررسی شد.
- `backend/handlers/*`: تغییری لازم نبود (بک‌اند درست است؛ reports به completed_at وابسته نیست).
- `admin-panel/index.html`: تغییر نیافت (فقط reference قرارداد؛ UI ارزیابی کارمندی در تسک قبلی
  مشخص شد که وجود ندارد).

## I) Security / Contract Impact

- RLS در codebase/docs بهتر شد: YES (سند + addendum اجرا شد توسط مالک در Dashboard؛ ۶ policy تأیید شد).
- live DB changed: **YES** (فقط policyها، توسط مالک در Dashboard — نه توسط agent).
- migration executed: **NO** (agent هیچ migrationی اجرا نکرد).
- SQL executed manually by owner in Supabase Dashboard: **YES** (addendum).
- deploy performed: **NO**.
- secrets added: **NO**.
- production runtime changed: **NO** (تغییر صرفاً افزودن policyهای RLS بود؛ رفتار زنده بک‌اند/پنل تغییر نکرد).

## J) Validation

- docs/sql sanity: فایل‌های جدید visually بازبینی و با grep references تأیید شدند.
- preflight: `npm run check:preflight` → PASS (db-source ۴۹/۰، regression ۱۳/۰).
- forbidden URL scan: فقط در docها به‌عنوان هشدار (استفاده نشده)؛ خروجی untracked `tmp/` نادیده گرفته شد.
- secret scan: هیچ secret در فایل‌های جدید / backend / admin-panel یافت نشد.
- notes: migration اجرا نشد؛ deploy انجام نشد.

## Final status: **PARTIAL** (RLS gap بخشِ project-control: RESOLVED)
- علت: بررسی و مستندسازی کامل انجام شد؛ migration `completed_at` آماده اما **اجرا نشده** (نیازمند
  اجرای دستی در Supabase Dashboard). ۳ gap RLS شناسایی شده بودند و addendum توسط مالک در Dashboard
  اجرا شد و خروجی `pg_policies` هر ۶ policy را تأیید کرد → **RLS gap project-control: RESOLVED**.
  با اجرای شماره ۵ + ۷ در Supabase، وضعیت کلی به READY/PASSED ارتقا می‌یابد (مورد ۸ قبلاً انجام شد).
