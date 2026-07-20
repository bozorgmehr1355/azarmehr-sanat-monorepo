# چک‌لیست migration به سرور ایران

> این فایل چک‌لیست اجرایی برای انتقال سرویس‌ها و دیتابیس به سرور مقصد (ایران) است.
> **هیچ مرحله‌ای بدون تأیید صریح مالک اجرا نشود.**
> مبنای وضعیت فعلی: `FINAL_STATE_SUMMARY.md` (۱۴۰۵/۰۴/۲۹)

---

## □ ۱. Preflight (قبل از هر اقدامی)

### ۱.۱ پیش‌نیازهای کلی
- [ ] `npm run check:preflight` روی مبدأ — هر دو gate سبز باشند
- [ ] `npm run check:db-source` — ۷۴ passed, ۰ failed
- [ ] `npm run check:regression-safety` — ۱۳ passed, ۰ failed
- [ ] `node scripts/validate-products.js` — PASS
- [ ] Git working tree **clean** (جز untracked مجاز)
- [ ] `docs/SERVICE_HEALTH_MATRIX.md` جاری — همه سرویس‌های مقصد ثبت شده باشند
- [ ] `docs/DATABASE_SOURCE_OF_TRUTH.md` — schema مقصد با آن مطابقت دارد
- [ ] `docs/SERVICE_CONTRACTS.md` — قراردادهای سرویس برای مقصد به‌روز شده باشند
- [ ] `docs/DEVELOPMENT_RULES.md` — قواعد توسعه برای مقصد بازبینی شده باشد

### ۱.۲ محیط مقصد
- [ ] سرور ایران (VPS/VM) provisioned و ssh reachable باشد
- [ ] Node.js نسخه ≥ ۱۸ روی سرور نصب باشد
- [ ] PostgreSQL ≥ ۱۴ روی سرور نصب باشد
- [ ] Systemd یا supervisor برای process management تنظیم شده باشد
- [ ] Nginx یا reverse proxy برای TLS termination پیکربندی شده باشد
- [ ] Domain/dns ثبت و指向 IP سرور شده باشد
- [ ] SSL certificate (Let's Encrypt) صادر شده باشد
- [ ] Port‌های مورد نیاز (۴۴۳, ۸۰, ۵۴۳۲) فایروال باز شده باشند

---

## □ ۲. Schema Verification (تأیید schema مقصد)

### ۲.۱ دیتابیس خالی
- [ ] PostgreSQL instance روی سرور Iran نصب و running باشد
- [ ] دیتابیس خالی با نام مشخص (مثلاً `azarmehr_iran`) ایجاد شود
- [ ] کاربر دیتابیس با رمز fresh ایجاد شود
- [ ] `pg_hba.conf` فقط اتصال local یا از طریق reverse proxy اجازه دهد
- [ ] SSL اجباری برای اتصال از راه دور

### ۲.۲ اعمال schema از SoT
- [ ] **اجرا نشود** مگر در dry-run مرحله ۵
- [ ] SoT جاری: `supabase/crm-production-baseline.sql` — مبدأ schema
- [ ] Gate 2 (crm_notifications) پیش از migration schema باید resolve شود
- [ ] کلیه اسکریپت‌های migration مسیر `supabase/` بازبینی شوند:
  - [ ] `rbac-tables.sql` — نیازمند بازنویسی برای VIEW بودن users
  - [ ] `create-groups-tables.sql` — FK به users باید بازنویسی شود
  - [ ] `rbac-users-system-role.sql` — ALTER TABLE users حذف شود (VIEW)
  - [ ] `create-notifications-table.sql` — مستقل از users VIEW
- [ ] هیچ اسکریپت untracked (`crm-rls-remediation.sql`) استفاده نشود

### ۲.۳ تأیید post-deploy
- [ ] جدول‌های اصلی موجود باشند (crm_customers, crm_orders, etc.)
- [ ] RLS روی جداول CRM ENABLE شده باشد
- [ ] Policies مطابق `crm-production-baseline.sql:480-520` اعمال شده باشند
- [ ] تابع `notify_next_team_member()` و trigger `trg_order_status_notify` ایجاد شده باشند
- [ ] `notify_next_team_member()` SECURITY DEFINER — نیازمند بررسی دسترسی writing به `crm_notifications`

---

## □ ۳. Fresh Secrets (رازهای مقصد)

### ۳.۱ تولید رمزهای جدید
- [ ] `JWT_SECRET` — رشته تصادفی جدید (openssl rand -hex 64)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — معادل Supabase: service_role token جدید برای مقصد
- [ ] `SUPABASE_URL` / `SUPABASE_KEY` — آدرس دیتابیس مستقیم در ایران
- [ ] `ULTRAMSG_TOKEN` / `ULTRAMSG_INSTANCE` — در صورت استفاده از واتساپ در ایران
- [ ] `ULTRAMSG_WEBHOOK_SECRET` — رمز جدید برای webhook
- [ ] `OPENAI_API_KEY` / `GAPGPT_API_KEY` — در صورت استفاده از AI
- [ ] `QA_MATCH_API_URL` — در صورت وجود endpoint کیوآی در ایران

### ۳.۲ تنظیم env
- [ ] `.env.production` در سرور ایران (هرگز commit نشود)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` فقط به‌عنوان env variable، نه hardcoded
- [ ] `DATABASE_URL` مستقیم (بدون pooler) برای VPS
- [ ] Connection pool size محدود (مثلاً ۱۰) برای VPS
- [ ] دسترسی `pg_hba.conf`只 allow از localhost برای env DB

### ۳.۳ امنیت
- [ ] `.env.*` هرگز commit / stage نشود
- [ ] اسکریپت `check:db-source` در مقصد هم اجرا شود (Gate hardcoded URL)
- [ ] پس از تولید رمزها، `git status` هیچ `.env` جدیدی نشان ندهد

---

## □ ۴. Test-Data Smoke (دود测试 داده آزمایشی)

### ۴.۱ بارگذاری داده آزمایشی
- [ ] مجموعه داده حداقلی (۵–۱۰ رکورد) برای هر جدول CRM تولید شود
- [ ] `crm_customers` — مشتری خرده و عمده با `auth_user_id` مصنوعی
- [ ] `crm_orders` — سفارش در وضعیت‌های مختلف
- [ ] `crm_notifications` — در صورت resolve Gate 2
- [ ] `users` (VIEW) — رکورد متناظر در `panel_users`
- [ ] `user_roles` / `group_members` — برای RBAC test

### ۴.۲ smoke test backend
- [ ] نصب وابستگی‌ها: `npm install`
- [ ] استارت سرویس: `node backend/server.js` یا `vercel dev` (local)
- [ ] GET `/api/health` → 200
- [ ] POST `/api/login` با credentials آزمایشی → token صادر شود
- [ ] GET `/api/users` با JWT admin → 200
- [ ] GET `/api/crm-customers` با JWT admin → 200 (داده ساختگی)
- [ ] POST `/api/crm-orders` → 201 (با customer_id معتبر)
- [ ] PUT status روی سفارش → trigger `notify_next_team_member()` → `crm_notifications` populated
- [ ] Webhook واتساپ (در صورت وجود) → 200

### ۴.۳ smoke test frontend (اختیاری)
- [ ] admin-panel بارگذاری شود → لاگین کار کند
- [ ] wholesale-portal بارگذاری شود → لاگین عمده کار کند
- [ ] notification panel رفرش شود → `crm_notifications` نمایش داده شود
- [ ] messenger-app (در صورت نیاز) کار کند

### ۴.۴ پاکسازی داده آزمایشی
- [ ] پس از smoke، داده آزمایشی از دیتابیس مقصد پاک شود
- [ ] یا snapshot گرفته شود قبل از smoke برای restore

---

## □ ۵. Dry-Run (اجرای خشک)

### ۵.۱ پیش از dry-run
- [ ] مراحل ۱–۴ همگی PASS شده باشند
- [ ] Rollback plan مستند و تأیید شده باشد (مرحله ۶)
- [ ] Backup از production مبدأ گرفته شده باشد
- [ ] یک snapshot از دیتابیس خالی مقصد گرفته شده باشد
- [ ] تمام scriptها idempotent باشند (IF NOT EXISTS / DROP قبل CREATE)
- [ ] هیچ اتصال active از clientهای واقعی به مقصد نباشد

### ۵.۲ اجرای dry-run
- [ ] Schema migration از SoT (پس از resolve Gate 2)
- [ ] RLS policies اعمال شوند
- [ ] Triggerها و functionها ایجاد شوند
- [ ] Migration scripts در مسیر `supabase/` (بازنویسی‌شده برای VIEW) اجرا شوند
- [ ] **هیچ داده production‌ای وارد نشود**
- [ ] Log کامل ثبت شود

### ۵.۳ تأیید dry-run
- [ ] تمام جداول با ستون‌های مورد انتظار ایجاد شده باشند
- [ ] RLS ENABLE + policies معتبر باشند (کوئری با JWT تست شود)
- [ ] `notify_next_team_member()` با simulate status change کار کند
- [ ] هیچ error 42601 (syntax) یا 42P01 (undefined table) در log نباشد
- [ ] `check:preflight` در مقصد PASS باشد

### ۵.۴ پس از dry-run
- [ ] Rollback: دیتابیس مقصد به snapshot خالی اولیه برگردانده شود
- [ ] Lessons learned ثبت شود
- [ ] هر اصلاحیه در SoT schema اعمال شود

---

## □ ۶. Backup / Rollback (پشتیبان و بازگشت)

### ۶.۱ قبل از migration واقعی
- [ ] Full backup production مبدأ: `pg_dump -Fc` (فرمت custom)
- [ ] Full backup مقصد (خالی): snapshot گرفته شود
- [ ] اسکریپت rollback نوشته و تست شده باشد:
  - [ ] DROP همه جداول جدید مقصد
  - [ ] DROP همه functionهای جدید
  - [ ] DROP همه triggerهای جدید
  - [ ] بازگشت secrets به حالت قبل (در صورت overwrite)
- [ ] Rollback plan در فایل `docs/ROLLBACK_PLAN.md` مستند شود

### ۶.۲ rollback در عمل
- [ ] حداکثر زمان مجاز rollback: ۳۰ دقیقه
- [ ] اگر migration بیش از ۳۰ دقیقه طول کشید → abort + rollback
- [ ] اگر هر مرحله از migration با error مواجه شد → rollback فوری
- [ ] پس از rollback: `check:db-source` + `check:regression-safety` باید PASS باشند

---

## □ ۷. Production Data Migration Approval Gate

### ۷.۱ شرایط ورود (همه باید ✅ باشند)
- [ ] ✅ مراحل ۱–۶ همگی PASS
- [ ] ✅ Gate 2 (crm_notifications) — RESOLVED
- [ ] ✅ Schema migration scripts بازنویسی‌شده برای VIEW بودن users
- [ ] ✅ Dry-run بدون error
- [ ] ✅ Rollback plan مستند و تست شده
- [ ] ✅ Secrets fresh و تنظیم شده
- [ ] ✅ مالک صریحاً دستور GO داده باشد

### ۷.۲ اجرای migration داده
- [ ] اتصال production مبدأ قطع شود (read-only mode)
- [ ] `pg_dump -Fc` از production مبدأ گرفته شود
- [ ] فایل dump به سرور ایران منتقل شود (scp / rsync رمزگذاری‌شده)
- [ ] `pg_restore` روی دیتابیس مقصد اجرا شود
- [ ] Validation queryها اجرا شوند (COUNT تطابق)
- [ ] Application servers روی مقصد start شوند
- [ ] Smoke test نهایی روی داده واقعی:
  - [ ] لاگین admin کار کند
  - [ ] لاگین مشتری عمده کار کند
  - [ ] لاگین خرده (phone) کار کند
  - [ ] CRUD روی مشتریان کار کند
  - [ ] سفارش جدید ثبت شود
  - [ ] Status change → notification تولید شود
  - [ ] Webhook واتساپ پاسخ 200 دهد

### ۷.۳ پس از migration (steady-state)
- [ ] DNS/domain به IP سرور ایران指向 شود
- [ ] SSL valid باشد
- [ ] Monitoring active باشد (health check هر ۵ دقیقه)
- [ ] Log aggregation فعال باشد
- [ ] مبدأ (سرور فعلی) به read-only mode یا خاموش شود
- [ ] Backup دوره‌ای روی مقصد تنظیم شود

---

## پیوست: وضعیت Gate‌ها (مطابق FINAL_STATE_SUMMARY.md)

| Gate | وضعیت | توضیح | تأثیر بر migration |
|---|---|---|---|
| Gate 1 | ✅ CLOSED | user_id = legacy; auth_user_id = ownership | بدون تأثیر |
| Gate 2 | 🔴 BLOCKED | crm_notifications تعریف نشده | **باید پیش از schema migration resolve شود** |
| Gate 4 | ✅ CLOSED | Option A: auth.jwt() ->> 'system_role' | RLS policies از این الگو استفاده کنند |
| Gate 5 | ✅ CLOSED | Option A: preserve VIEW | کلیه اسکریپت‌های SQL باید با VIEW سازگار باشند |

> **هشدار:** تا زمانی که Gate 2 resolve نشده، هیچ migration schemaای اجرا نشود. `crm_notifications` در production وجود دارد اما در repo تعریف نشده — restore به مقصد بدون تعریف صریح آن می‌تواند باعث شکست trigger `trg_order_status_notify` شود.
