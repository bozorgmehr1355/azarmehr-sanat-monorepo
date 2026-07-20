# وضعیت نهایی — خلاصه مصوبات و تصمیمات (۱۴۰۵/۰۴/۲۹)

> این فایل خلاصه وضعیت جاری repo و production برای مرجع سریع است.
> **هیچ دستوری در این فایل الزام‌آور نیست** — منبع تصمیمات چت جاری است.

## وضعیت کلی migration به سرور ایران

- **NOT READY** برای انتقال داده production
- فقط planning / preflight / dry-run readiness تا اطلاع ثانوی
- migration واقعی فقط پس از: schema final + test-data smoke + dry-run + rollback plan

## ساختار دیتابیس

### public.users
- **VIEW** روی `panel_users` (BASE TABLE) باقی می‌ماند
- تبدیل به TABLE واقعی نخواهد شد مگر منبع حقیقت به‌صورت رسمی تغییر کند
- ستون `system_role` از طریق VIEW در دسترس است

### crm_customers
- `auth_user_id` (uuid) = **منبع ownership** (تمامی RLS policies روی این ستون ساخته شده)
- `user_id` (integer) = **legacy orphan** — هیچ FK یا policy روی آن نیست، بدون کاربرد عملیاتی
- RLS policy pattern: `auth_user_id = auth.uid()`

## نقش canonical (system_role)

- منبع: `auth.jwt() ->> 'system_role'` **(Option A تصویب شد)**
- این claim باید در زمان لاگین (backend login.js) در JWT تنظیم شود
- RLS policy pattern برای admin:
  ```sql
  auth.jwt() ->> 'system_role' IN ('super_admin', 'admin')
  ```
- ⚠️ `auth.jwt()` JWT متفاوت از backend JWT است — ستون `system_role` در `auth.users` از Dashboard قابل تنظیم نیست (نیازمند custom claims یا trigger)

## Gateها

| Gate | وضعیت | توضیح |
|---|---|---|
| Gate 1 (user_id mapping) | ✅ CLOSED | user_id = legacy orphan; auth_user_id = ownership |
| Gate 2 (crm_notifications) | 🔴 BLOCKED | جدول در repo CREATE TABLE ندارد — نیازمند production metadata |
| Gate 4 (system_role source) | ✅ CLOSED | Option A: auth.jwt() ->> 'system_role' |
| Gate 5 (users drift) | ✅ CLOSED | Option A: preserve VIEW over panel_users |

## محدودیت‌ها

- backend smoke = **تأیید health endpoint، نه RLS**
- smoke پاس کردن به معنی درستی RLS policies نیست
- RLS فقط با تست واقعی روی دیتابیس قابل تأیید است
- رازها/رمزهای مقصد (destination) باید fresh تولید شوند — رمزهای فعلی production قابل استفاده نیستند

## پیش‌نیازهای migration واقعی

- [ ] schema نهایی تأیید شود
- [ ] test-data smoke روی destination اجرا شود
- [ ] dry-run کامل انجام شود
- [ ] rollback plan مستند شود
- [ ] رمزهای fresh تولید و تنظیم شوند
- [ ] Gate 2 (crm_notifications) resolve شود
