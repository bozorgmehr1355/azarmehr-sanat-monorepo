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

# 5. (همیشه) npm run validate:products  # در P1.1.2-A بازیابی شد (structural no-op اگر catalog محلی نباشد)
```

### ممنوعیت‌ها

- هرگز سرویسی را بدون عبور از preflight gate deploy نکن
- هرگز hardcoded connection string یا secret را در فایل‌های tracked قرار نده
- هرگز runtime logic را بدون بررسی downstream services تغییر نده
- هرگز وضعیت OK را برای سرویسی ثبت نکن مگر اینکه واقعاً تست شده باشد

---

## بخش ۳ — Messenger App Build Pipeline

### منبع واقعی UI

تنها فایل source معتبر برای UI پیام‌رسان داخلی:

```
messenger-app/components/index.jsx
```

### pipeline ساخت

```
components/index.jsx
        ↓ (Browserify + Babelify)
  npm run build:min
        ↓
  messenger-app/bundle.min.js
        ↓
  index.html لود می‌کند ← <script src="bundle.min.js">
```

### قوانین

1. **build الزامی است** — `index.html` مستقیماً `bundle.min.js` را لود می‌کند، نه فایل JSX را. پس از هر تغییر در `components/index.jsx`:
   ```bash
   cd messenger-app
   npm run build:min
   ```
2. **cache مرورگر** — `bundle.min.js` بدون query string لود می‌شود. برای دیدن تغییرات بعد از build:
   - `Ctrl + F5` (Hard Refresh) یا
   - DevTools → Network → تیک `Disable cache`
3. **دایرکتوری `modules/` کد مُرده است** — فایل‌های `modules/Admin.jsx`، `modules/Chat.jsx`، `modules/CRM.jsx` و بقیه در زنجیره build استفاده نمی‌شوند. ویرایش در این فایل‌ها **هیچ اثری در خروجی ندارد**.
4. **production فقط با deploy صریح** — تغییرات local تا زمانی که `vercel --prod` اجرا نشود در production دیده نمی‌شود.
5. **تغییر در messenger-app** ← بررسی backend dependency (طبق بخش ۲، بند ۳).
