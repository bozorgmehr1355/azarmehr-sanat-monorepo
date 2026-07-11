# Development Rules

> تکمیلی بر AGENTS.md — قواعد توسعه و جلوگیری از رگرسیون

---

## بخش ۱ — اتصال به دیتابیس

### منبع داده

تنها منبع داده **Supabase** است از طریق Supabase JS Client.
هیچ handler ای نباید مستقیماً به PostgreSQL وصل شود.

### متغیرهای مجاز در Runtime

✅ مجاز:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_KEY` (فقط به عنوان fallback)

🚫 ممنوع در runtime:
- `DATABASE_URL`
- `POSTGRES_URL`
- `SUPABASE_POSTGRES_URL`

### دسترسی مستقیم PostgreSQL

- فقط در اسکریپت‌های ابزاری (migration, debug, import)
- اجباری: استفاده از `process.env.X` — هرگز hardcoded
- اجباری: فایل `.env` متناظر gitignored باشد

### کانکشن استرینگ

- هرگز در فایل‌های tracked قرار نگیرد
- فقط در `.env` (gitignored) یا Vercel runtime Environment Variables
- `docs/DATABASE_SOURCE_OF_TRUTH.md` مرجع معماری است

---

## بخش ۲ — جلوگیری از رگرسیون بین‌سرویسی

### قواعد تغییر

1. **تغییر در backend** → حتماً `npm run check:preflight` + syntax check backend + بررسی downstream services
2. **تغییر در whatsapp-broadcast-api** → حتماً webhook GET smoke test + بررسی intent pipeline
3. **تغییر در wholesale-portal / admin-panel / messenger-app** → بررسی backend dependency
4. **تغییر در docs/ یا AGENTS.md یا package.json** → بررسی consistency همه مستندات

### قوانین تأیید سلامت

1. هرگز "system is healthy" را تأیید نکن مگر اینکه `docs/SERVICE_HEALTH_MATRIX.md` جاری تأیید کند
2. اگر سرویسی قابل تست نیست → وضعیت **UNKNOWN** ثبت شود، نه OK
3. اگر سرویسی BROKEN است → ابتدا رفع شود، سپس commit/deploy

### ترتیب اجباری قبل از commit/deploy

```bash
# 1. گیت دیتابیس
npm run check:db-source

# 2. گیت رگرسیون
npm run check:regression-safety

# 3. هر دو هم‌زمان
npm run check:preflight

# 4. سرویس‌های تغییرکرده را smoke تست کن
```

### ممنوعیت‌ها

- هرگز سرویسی را بدون عبور از preflight gate deploy نکن
- هرگز hardcoded connection string یا secret را در فایل‌های tracked قرار نده
- هرگز runtime logic را بدون بررسی downstream services تغییر نده
- هرگز وضعیت OK را برای سرویسی ثبت نکن مگر اینکه واقعاً تست شده باشد
