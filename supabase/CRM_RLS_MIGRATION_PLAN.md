# CRM RLS Migration Plan — DRAFT

> **Status: DRAFT — NOT APPROVED — NOT EXECUTED**
> تاریخ تهیه: ۱۴۰۵ (۲۰۲۶) — تهیه شده در context backend/ (Path B)

---

## 1. Target Service
`backend/` (از طریق Supabase JS Client / service-role). تأثیر مستقیم روی wholesale-portal و admin-panel (مصرف‌کنندهٔ CRM).

## 2. Scope (دقیق جداول CRM براساس baseline)
فقط این ۴ جدول واقعی CRM از `supabase/crm-production-baseline.sql`:
- `public.crm_customers`
- `public.crm_draft_orders`
- `public.crm_orders`
- `public.crm_order_items`

تغییر فقط در لایهٔ RLS/policy مجاز است. **هیچ تغییری در schema/streak/ستون/داده پیشنهاد نمی‌شود.**

## 3. Source of Truth و فایل‌های Excluded/Legacy
- **Source of Truth (SoT):** `supabase/crm-production-baseline.sql` — snapshot دقیق schema production (استخراج ۲۵ تیر ۱۴۰۵ از production Pooler). خوانده شد؛ مبنای تمام ادعاهای این plan.
- **Excluded / NOT trusted:**
  - `supabase/crm-rls-remediation.sql` — فایل untracked، در history دیده نشده، طبق مستندات "دraft" ناسازگار؛ به‌عنوان migration معتبر استفاده نشد. (بررسی وضعیت → بخش ۵)
  - `supabase/create-crm-tables.sql` — **وجود ندارد** در working tree (قبلاً به Recycle Bin منتقل شد). طبق PROJECT_MAP legacy است (UUID به‌جای bigint، نبود `auth_user_id`)؛ طبق این task استفاده نشد.
- فایل baseline **تغییر نیافت** و نباید اجرا شود (snapshot است نه migration).

## 4. نتیجه بررسی وضعیت `crm-rls-remediation.sql`
- `git status --short -- supabase/` → فقط `?? supabase/crm-rls-remediation.sql` (untracked).
- `git ls-files -- supabase/crm-rls-remediation.sql` → خروجی خالی (tracked نیست).
- `git log --all --oneline -- supabase/crm-rls-remediation.sql` → خروجی خالی (در history نیست).
- نتیجه: فایل stray/untracked است، هیچ where در repo به آن استناد نمی‌کند، و طبق PROJECT_MAP با production ناسازگار است (انتظار bigint `id` + `auth_user_id` uuid؛ draft قدیمی UUID بود). **تصمیم:** به‌عنوان SoT یا migration معتبر استفاده نشود. این plan جایگزین non-executable آن است.

## 5. Current-State Inventory (براساس شواهد baseline)

### جداول و PKها
| جدول | PK | نوع PK | sequence |
|---|---|---|---|
| crm_customers | id | **bigint** | crm_customers_id_seq |
| crm_draft_orders | id | bigint | crm_draft_orders_id_seq |
| crm_orders | id | bigint | crm_orders_id_seq |
| crm_order_items | id | bigint | crm_order_items_id_seq |

### ownership / user mapping (ستون‌های مالکیت)
- `crm_customers.auth_user_id` = **uuid, NULLABLE** (NOT NULL نیست، unique/index/FK ندارد). این ستون پیوند به `auth.users` است و با `auth.uid()` نگاشت می‌شود. → ownership بدون حدس قابل نگاشت است.
- `crm_customers.user_id` = **integer** (متفاوت از `auth_user_id`؛ احتمالاً reference داخلی عددی، نه Supabase auth UUID). **BLOCKED/TBD:** معنای دقیق `user_id` (integer) مشخص نیست — نباید با `auth.uid()` اشتباه گرفته شود.
- `crm_draft_orders.customer_id` = bigint FK → crm_customers(id) ON DELETE CASCADE
- `crm_orders.customer_id` = bigint FK → crm_customers(id)
- `crm_order_items.order_id` = bigint FK → crm_orders(id); `product_id` = bigint FK → products(id)

### indexes مرتبط با ownership
- `idx_crm_customers_user_id` (روی `user_id` integer — نه auth_user_id)
- `uq_crm_portal_username` (partial unique روی portal_username WHERE NOT NULL)
- `idx_crm_draft_orders_customer` / `_customer_id` (روی customer_id)
- `idx_crm_orders_customer` / `_customer_id` (روی customer_id)
- `idx_crm_order_items_order_id` / `_product_id`
- **فاقد index صریح روی `auth_user_id`** → پیشنهاد در بخش ۸ (index غیرفعال در plan، نیازمند approval جداگانه).

### RLS فعلی
- هر ۴ جدول: `ENABLE ROW LEVEL SECURITY` (طبق baseline خط ۴۶۷‑۴۷۰). `FORCE RLS` دیده نشد.

### policyهای فعلی (فقط ۴ تا، همگی SELECT TO authenticated)
- `crm_customers_customer_read` → `auth_user_id = auth.uid()`
- `crm_draft_orders_customer_read` → EXISTS subquery روی crm_customers.auth_user_id
- `crm_orders_customer_read` → EXISTS subquery روی crm_customers.auth_user_id
- `crm_order_items_customer_read` → JOIN crm_orders→crm_customers.auth_user_id
- **هیچ admin_all / INSERT / UPDATE / DELETE policy وجود ندارد** (تأیید شده در baseline خط ۴۷۶‑۴۷۸: "No admin_all policies exist in production as of this baseline").

### grants / roles
- در baseline هیچ `GRANT`/`REVOKE`/`role` صریح برای CRM دیده نشد. دسترسی admin از طریق **backend service-role** (دور زدن RLS) انجام می‌شود.
- تابع `notify_next_team_member()` با `SECURITY DEFINER` وجود دارد (trigger وضعیت سفارش) — نیازمند بررسی جداگانه امنیتی (BLOCKED/TBD در این plan).

## 6. Access Matrix پیشنهادی
| عملیات | anon | authenticated (مشتری) | admin/backend (service-role) | توضیح |
|---|---|---|---|---|
| SELECT | ❌ deny | ✅ فقط رکوردهای متعلق به `auth_user_id` خودش | ✅ (service-role دور می‌زند) | وضعیت فعلی حفظ شود |
| INSERT | ❌ deny | ⚠️ TBD (wholesale portal ایجاد می‌کند؟) | ✅ backend proxy | بدون approval صریح پیش‌فرض deny |
| UPDATE | ❌ deny | ⚠️ TBD (فقط فیلدهای محدود مشتری؟) | ✅ backend proxy | بدون approval صریح پیش‌فرض deny |
| DELETE | ❌ deny | ❌ deny | ✅ backend proxy (soft-delete via deleted_at) | حذف فیزیکی ممنوع |

- **anon:** هیچ دسترسی پیش‌فرض پیشنهاد نمی‌شود (deny-by-default).
- **service_role:** در policy جعل نمی‌شود؛ دسترسی از مسیر backend proxy (مورد اعتماد) می‌آید.

## 7. طراحی پیشنهادی Policyها (فقط طرح — اجرا نشده)
اصل: سیاست‌های موجود customer_read حفظ شوند (صحیح و مبتنی بر SoT). شکاف‌ها فقط به‌صورت پیشنهاد ثبت می‌شوند:

- **SELECT (موجود، تاییدشده):** هر ۴ جدول دارای customer_read صحیح → **keep as-is**.
- **INSERT:** پیشنهاد (نیازمند approval): مشتری فقط رکوردی که `auth_user_id = auth.uid()` دارد ایجاد کند؛ برای draft/order از طریق backend proxy (service-role) ایجاد شود. **پیش‌فرض: deny تا تأیید owner.**
- **UPDATE:** پیشنهاد (نیازمند approval): مشتری فقط فیلدهای غیرحساس (مثلاً `notes` خودش)؛ نه فیلدهای مالی/وضعیت. **پیش‌فرض: deny تا تأیید owner.**
- **DELETE:** پیشنهاد: فقط soft-delete توسط admin از مسیر backend؛ deny برای مستقیم client.

هیچ `DROP POLICY` / `ALTER TABLE` / `GRANT` / `REVOKE` در این plan اجرا نمی‌شود.

## 8. طبقه‌بندی Policy (user-owned / backend-only / admin-only)
- `crm_*_customer_read` (SELECT) → **user-owned** (auth_user_id = auth.uid())
- INSERT/UPDATE/DELETE مشتری → **admin-only از طریق backend proxy** (service-role)؛ دسترسی direct client **deny** تا approval.
- تمام عملیات admin → **backend-only** (service-role bypass).

## 9. ریسک deny-by-default
- وضعیت فعلی fail-closed است (فقط SELECT مشتری، بقیه deny). این **امن** است.
- ریسک: اگر wholesale-portal مستقیماً INSERT draft/order انجام دهد بدون backend proxy، با اجرای policyهای جدیدِ restrict ممکن است مسدود شود → باید قبل از هر تغییر confirm شود که wholesale-portal از backend proxy استفاده می‌کند (BLOCKED/TBD — در PROJECT_MAP ذکر شده wholesale-portal کلاینت مستقیم Supabase anon دارد؛ تناقض احتمالی با RLS جدید).

## 10. ریسک شکستن ReportsModule یا backend API
- `trg_order_status_notify` (SECURITY DEFINER) پیام به `crm_notifications` می‌نویسد. اگر RLS روی `crm_notifications` فعال باشد و trigger با کاربر غیرمجاز اجرا شود، ممکن است fail کند. **BLOCKED/TBD:** وضعیت RLS جدول `crm_notifications` در baseline این فایل نیامده (در scope ۴ جدول CRM نیست) → باید جداگانه بررسی شود.
- backend از service-role استفاده می‌کند → RLS را دور می‌زند؛ بنابراین APIهای backend فعلی **تحت تأثیر منفی نخواهند بود** مگر مسیر مستقیم client اضافه شود.

## 11. Idempotency Strategy
- هر policy با الگوی `DROP POLICY IF EXISTS ...; CREATE POLICY ...` (مطابق baseline).
- ترتیب: همیشه بعد از هر بازاجرای احتمالی rls-policies عمومی، addendum CRM باید مجدد اجرا شود (درس از DB_MIGRATION_READINESS.md بخش E).
- هیچ `CREATE TABLE` / `ALTER` در این plan نیست.

## 12. Pre-Migration Backup / Snapshot Plan
- قبل از اجرا: `pg_dump` از schema public فقط جداول CRM (در صورت اجرای واقعی توسط owner).
- تهیه snapshot از `pg_policies` و `pg_tables` (rowsecurity) جهت rollback مقایسه‌ای.
- تهیه export از جدول `crm_customers` (فقط ستون‌های غیرحساس) جهت بازگردانی وضعیت RLS در صورت نیاز.
- **در این task انجام نشد** (فقط plan).

## 13. Rollback Plan
- حذف policyهای جدید: `DROP POLICY IF EXISTS ...` برای هر policy اضافه‌شده.
- بازگرداندن وضعیت به snapshot قبلی (فقط customer_read ۴ تا).
- چون backend service-role است، rollback فوری هیچ route زنده‌ای را نمی‌شکند.

## 14. ترتیب اجرای Staging و Production
1. تأیید owner + تهیه backup (بخش ۱۲).
2. اجرا روی **staging** (پروژه supabase staging) از طریق Dashboard یا migration script idempotent.
3. اجرای pre-check: وجود `auth_user_id` uuid روی crm_customers؛ تطابق `id` bigint.
4. smoke تست (بخش ۱۷).
5. فقط پس از تایید staging + approval جداگانهٔ production → اجرا روی production.
6. تایید `pg_policies` در هر دو محیط.

## 15. Preflightهای رسمی backend/database
قبل از هر اجرا (در زمان واقعی):
- `npm run check:db-source` (gate معماری دیتابیس)
- `npm run check:regression-safety` (رگرسیون بین‌سرویسی)
- `npm run check:preflight` (هر دو هم‌زمان)
- نکته: این task فقط Markdown ایجاد کرد؛ preflightها در بخش تست مشخص اجرا شدند (فقط روی تغییرات موجود، نه اجرای SQL).

## 16. Smoke Test رسمی backend/CRM
- **Smoke رسمی CRM در repo یافت نشد** (در DB_MIGRATION_READINESS فقط project-control دارای smoke است؛ CRM نه).
- **پیشنهاد check سبک (جایگزین):** چون تغییر فقط Markdown است و SQL اجرا نشده، یک *static consistency check* انجام شد:
  - تایید `crm_customers.id` = bigint در baseline (شواهد خط ۱۶۵).
  - تایید `auth_user_id` uuid nullable (خط ۲۲۷) → نگاشت `auth.uid()` معتبر است.
  - تایید عدم تناقض بین plan و baseline.
- در صورت اجرای واقعی migration در آینده، smoke پیشنهادی:
  - `POST /api/crm-customers` (admin) → 201
  - `GET /api/crm-customers/:id` با توکن مشتری → فقط رکورد متعلق به خودش (۴۰۳ برای غیرخودی)
  - `GET /api/crm-orders` مشتری → فقط سفارش‌های خودش

## 17. Secret Scan (فقط روی scope/staged file)
- ابزار رسمی repo: `npm run check:db-source` (بخش E: Env File Tracking + Hardcoded Secret) اجرا شد → PASS، هیچ secret در tracked/staged یافت نشد.
- scan سبک read-only روی فایل جدید `supabase/CRM_RLS_MIGRATION_PLAN.md`: فقط متن مستنداتی است؛ هیچ pattern secret (service_role/api_key/password/postgres:///DATABASE_URL) ندارد → PASS.
- نکته: فایل baseline شامل ستون‌های `password`/`portal_password` (داده schema، نه secret در فایل) است؛ در این plan چاپ/نشده‌اند.

## 18. Owner Approval Checklist
- [ ] تایید owner برای اجرای migration (plan + backup + staging).
- [ ] تایید نقش دقیق `user_id` (integer) در crm_customers (BLOCKED/TBD).
- [ ] تایید مسیر wholesale-portal (backend proxy vs direct client) قبل از محدودسازی INSERT/UPDATE.
- [ ] بررسی امنیتی `notify_next_team_member()` (SECURITY DEFINER) و وضعیت RLS `crm_notifications`.
- [ ] تایید production approval جداگانه قبل از اجرای prod.
- [ ] اجرای preflightها در زمان واقعی.

## 19. معیارهای Go/No-Go
- **GO** اگر: SoT تایید شد + backup انجام شد + staging تست شد + owner approval + تناقض wholesale-portal حل شد.
- **NO-GO** اگر: `auth_user_id` nullable باشد و نقشه ownership تایید نشود / wholesale-portal مستقیماً client باشد بدون proxy / تریگر SECURITY DEFINER بررسی نشده باشد.

## 20. موارد BLOCKED/TBD
- **BLOCKED/TBD:** معنای دقیق `crm_customers.user_id` (integer) — نباید با `auth.uid()` اشتباه شود.
- **BLOCKED/TBD:** وضعیت RLS جدول `crm_notifications` (خارج از scope ۴ جدول) و سازگاری با تریگر `notify_next_team_member()`.
- **BLOCKED/TBD:** مسیر دقیق wholesale-portal (backend proxy یا direct Supabase client) — تأثیر روی policyهای INSERT/UPDATE مشتری.
- **BLOCKED/TBD:** آیا claim `system_role` در JWT کانفیگ است؟ (برای هر policy احتمالی admin مبتنی بر `auth.jwt()`).

## 21. صریحاً اعلام می‌شود
- **هیچ SQL اجرا نشده** (نه local، نه staging، نه live).
- **هیچ migration ساخته یا اجرا نشده** (این فایل فقط plan است).
- **هیچ deploy/push انجام نشده**.
- فایل `crm-production-baseline.sql` تغییر نیافت.
- فایل `crm-rls-remediation.sql` (obsolete/legacy) stage/commit/restore نشد.
- هیچ دادهٔ محصول/CRM تغییر نیافت؛ `validate-products` لازم نبود.

## 22. قواعد امنیتی رعایت‌شده
- `crm_customers.id` به UUID تغییر نیافت (bigint باقی ماند).
- `auth.uid()` فقط به‌خاطر تایید `auth_user_id` uuid در baseline پیشنهاد شد.
- بدون شواهد، policy عمومی/permissive طراحی نشد.
- برای anon دسترسی پیش‌فرض پیشنهاد نشد.
- `service_role` در policy جعل نشد.
- `FORCE ROW LEVEL SECURITY` فقط به‌عنوان تصمیم نیازمند approval جداگانه مطرح شد (نه اعمال).
- هیچ DROP POLICY / ALTER TABLE / GRANT / REVOKE اجرا نشد.
- هیچ SQL به Supabase ارسال نشد.
- stage/commit/push/deploy انجام نشد.
