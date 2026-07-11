# Database Source of Truth

> آخرین به‌روزرسانی: ۲۰ تیر ۱۴۰۴

## معماری اتصال دیتابیس

```
Runtime Handler
  → @supabase/supabase-js (createClient)
    → SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    → Supabase REST API → PostgreSQL (مدیریت شده توسط Supabase)
```

Runtime فقط از **Supabase JS Client** استفاده می‌کند. هیچ handler ای مستقیماً به PostgreSQL وصل نمی‌شود.

---

## متغیرهای محیطی

### Runtime (استفاده در کد اصلی)

| متغیر | نقش | وضعیت |
|-------|------|--------|
| `SUPABASE_URL` | آدرس پروژه Supabase | ✅ منبع اصلی |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سرویس (JWT) برای دسترسی admin | ✅ منبع اصلی |
| `SUPABASE_KEY` | کلید anon (fallback در صورت نبود SERVICE_ROLE) | ⚠️ فقط fallback |

### غیر Runtime (فقط برای اسکریپت‌های محلی/ابزاری)

| متغیر | نقش | وضعیت |
|-------|------|--------|
| `DATABASE_URL` | کانکشن مستقیم PostgreSQL | 🚫 ممنوع در runtime |
| `POSTGRES_URL` | کانکشن مستقیم PostgreSQL (pooler) | 🚫 ممنوع در runtime |
| `SUPABASE_POSTGRES_URL` | کانکشن مستقیم Supabase PostgreSQL | 🚫 ممنوع در runtime |

### Vercel Neon Integration

- `DATABASE_URL` و `POSTGRES_URL` توسط Neon Integration در Vercel مدیریت می‌شوند
- این متغیرها **منبع runtime نیستند** — backend از Supabase JS Client استفاده می‌کند
- اگر در آینده تصمیم به استفاده از Neon به عنوان دیتابیس اصلی گرفته شود، این سند باید به‌روز شود

---

## قوانین

1. **Runtime**: فقط `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` مجاز است.
2. **مستقیم PostgreSQL**: فقط در اسکریپت‌های محلی (migration, debug) از طریق `process.env.POSTGRES_URL` — هرگز hardcoded.
3. **فایل‌های `.env`**: همیشه gitignored — هرگز commit نشوند.
4. **Neon Integration**: حضور دارد ولی منبع runtime نیست. در صورت تغییر تصمیم، این سند به‌روز شود.
5. **SUPABASE_SERVICE_ROLE_KEY**: JWT است، نه رمز دیتابیس. فقط در صورت لو رفتن rotate شود.

---

## فایل‌های قرنطینه

| فایل | وضعیت |
|------|--------|
| `backend/query-portal.js` | ✅ انتقال به `F:\_secret_quarantine\` |
