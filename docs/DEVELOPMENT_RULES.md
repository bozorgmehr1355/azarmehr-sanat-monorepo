# Development Rules — Database Access

> تکمیلی بر AGENTS.md — قواعد مخصوص اتصال به دیتابیس

## منبع داده

تنها منبع داده **Supabase** است از طریق Supabase JS Client.
هیچ handler ای نباید مستقیماً به PostgreSQL وصل شود.

## متغیرهای مجاز در Runtime

✅ مجاز:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_KEY` (فقط به عنوان fallback)

🚫 ممنوع در runtime:
- `DATABASE_URL`
- `POSTGRES_URL`
- `SUPABASE_POSTGRES_URL`

## دسترسی مستقیم PostgreSQL

- فقط در اسکریپت‌های ابزاری (migration, debug, import)
- اجباری: استفاده از `process.env.X` — هرگز hardcoded
- اجباری: فایل `.env` متناظر gitignored باشد

## کانکشن استرینگ

- هرگز در فایل‌های tracked قرار نگیرد
- فقط در `.env` (gitignored) یا Vercel runtime Environment Variables
- `docs/DATABASE_SOURCE_OF_TRUTH.md` مرجع معماری است

## گیت gate

قبل از commit/deploy حتماً اجرا شود:
```bash
node scripts/check-db-source-of-truth.js
```
