# Service Contracts — Azarmehr Sanat Monorepo

> آخرین به‌روزرسانی: ۲۰ تیر ۱۴۰۴
>
> هر سرویس یک قرارداد دارد. تغییر در یک سرویس ممکن است روی سرویس‌های وابسته تأثیر بگذارد.
> قبل از commit/deploy حتماً regression safety gate را اجرا کنید.

---

## 1. Backend API

| فیلد | مقدار |
|------|-------|
| **مسیر** | `backend/` |
| **Git origin** | `github.com/bozorgmehr1355/azarmehr-backend` (nested repo مستقل) |
| **نوع** | Express API — Vercel Serverless Functions |
| **Node.js** | CommonJS (require/module.exports) |
| **Runtime dependencies** | express, @supabase/supabase-js, jsonwebtoken, bcryptjs, pg (tooling only), archiver, fs-extra, dotenv |
| **وضعیت node_modules** | ✅ نصب شده |
| **پکیج منیجر** | npm (package-lock.json موجود) |

### Environment Variables (Runtime)

| متغیر | نقش | منبع |
|-------|------|------|
| `SUPABASE_URL` | آدرس پروژه Supabase | ✅ مجاز — اصلی |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سرویس (admin JWT) | ✅ مجاز — اصلی |
| `SUPABASE_KEY` | کلید anon (fallback) | ⚠️ مجاز — فقط fallback |
| `JWT_SECRET` | رمز توکن‌های JWT | ✅ مجاز |
| `PORT` | پورت سرور (پیش‌فرض ۳۰۰۰) | ✅ مجاز |

### Environment Variables (ممنوع در Runtime)

| متغیر | دلیل |
|-------|------|
| `DATABASE_URL` | کانکشن مستقیم PostgreSQL — فقط در tooling |
| `POSTGRES_URL` | کانکشن مستقیم PostgreSQL — فقط در tooling |
| `SUPABASE_POSTGRES_URL` | کانکشن مستقیم PostgreSQL — فقط در tooling |
| `PGPASSWORD` | رمز دیتابیس — runtime نباید مستقیم وصل شود |

### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health endpoint** | `GET /api/health` (live: `https://azarmehr-backend.vercel.app/api/health`) |
| **Debug endpoint** | `GET /api/debug` (env status + lib health) |
| **Syntax check** | `node -c <file>` (۴۲ فایل JS ✅) |
| **Local start** | `node server.js` (یا `npm run dev`) |
| **Test** | `echo "No tests defined"` |
| **Build** | ندارد (Serverless Functions) |

### وابستگی‌ها

- **Upstream**: Supabase (دیتابیس اصلی)
- **Downstream**: Wholesale Portal, Admin Panel, Messenger App, WhatsApp API
- **اگر backend تغییر می‌کند**: همه ۴ سرویس downstream باید تست شوند

---

## 2. WhatsApp Broadcast API

| فیلد | مقدار |
|------|-------|
| **مسیر** | `whatsapp-broadcast-api/` |
| **Git origin** | `github.com/bozorgmehr1355/azarmehr-sanat-monorepo` (همان ریشه — بدون `.git` مجزا) |
| **نوع** | Vercel Serverless Functions — UltraMsg Webhook → Intent Engine |
| **Node.js** | CommonJS |
| **Runtime dependencies** | @supabase/supabase-js, jsonwebtoken, bcryptjs, pg (tooling only) |
| **وضعیت node_modules** | ❌ نصب نشده |
| **پکیج منیجر** | npm (package.json موجود) |

### Environment Variables (Runtime)

| متغیر | نقش | منبع |
|-------|------|------|
| `SUPABASE_URL` | آدرس پروژه Supabase | ✅ مجاز |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سرویس | ✅ مجاز |
| `JWT_SECRET` | رمز توکن‌های JWT | ✅ مجاز |
| `ULTRAMSG_INSTANCE_ID` | شناسه instance UltraMsg | ✅ مجاز |
| `ULTRAMSG_TOKEN` | توکن API UltraMsg | ✅ مجاز |

### Environment Variables (ممنوع در Runtime)

همانند Backend — `DATABASE_URL`, `POSTGRES_URL`, `SUPABASE_POSTGRES_URL` ممنوع.

### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Webhook verification** | `GET /api/webhook` (live: `https://whatsapp-broadcast-api.vercel.app/api/webhook`) |
| **⚠️ Health endpoint** | `GET /api/health` — **404** (فایل `health.js` مفقود) |
| **Syntax check** | `node -c <file>` (۶ فایل JS ✅) |
| **Intent smoke** | POST به `/api/webhook` با intent test payloads |
| **Local start** | `npx vercel dev` (نیاز به نصب node_modules) |

### وابستگی‌ها

- **Upstream**: UltraMsg (webhook inbound), Supabase (دیتابیس)
- **Downstream**: هیچ (outbound به کاربران WhatsApp)
- **اگر WhatsApp تغییر می‌کند**: webhook POST smoke test ضروری است

---

## 3. Admin Panel

| فیلد | مقدار |
|------|-------|
| **مسیر** | `admin-panel/` |
| **Git origin** | `github.com/bozorgmehr1355/azarmehr-admin` (nested repo مستقل) |
| **نوع** | SPA — React + Babel standalone (CDN), Chart.js |
| **Runtime dependencies** | هیچ npm dependency — همه از CDN (cdnjs) |
| **وضعیت node_modules** | ❌ وجود ندارد |
| **پکیج منیجر** | ندارد (بدون package.json) |

### Environment Variables

بدون env var runtime. `SUPA_KEY` (Supabase anon key) به صورت **hardcoded** در `index.html` وجود دارد.

### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health endpoint** | ❌ **مستقر نیست** — `https://azarmehr-admin.vercel.app/` → 404 |
| **Syntax check** | قابل اجرا نیست (JSX, Babel) |
| **Local serve** | هر HTTP server (مثلاً `npx serve`) |

### وابستگی‌ها

- **Upstream**: Supabase (Realtime + REST), Backend API (some routes)
- **Downstream**: هیچ
- **وضعیت جاری**: ❌ **خراب** — ۵ فایل ردیابی‌شده از دیسک حذف شده (README, dashboard.html, deploy workflow, NotificationContext)

---

## 4. Wholesale Portal

| فیلد | مقدار |
|------|-------|
| **مسیر** | `wholesale-portal/` |
| **Git origin** | `github.com/bozorgmehr1355/wholesale-portal` (nested repo مستقل) |
| **نوع** | SPA — Vanilla JS (SPA با fetch API) |
| **Runtime dependencies** | هیچ npm dependency |
| **وضعیت node_modules** | ❌ وجود ندارد |
| **پکیج منیجر** | ندارد |

### Environment Variables

| متغیر | نقش | منبع |
|-------|------|------|
| `VITE_API_BASE` | Base URL backend API (`https://azarmehr-backend.vercel.app/api`) | ✅ از `.env.example` |
| `WHATSAPP_API_BASE` | Base URL WhatsApp API (`https://whatsapp-broadcast-api.vercel.app`) | ✅ از `.env.example` |

### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health endpoint** | صفحه لود می‌شود (`https://wholesale-portal.vercel.app/`) ولی "Loading..." نمایش می‌دهد |
| **Syntax check** | قابل اجرا نیست (SPA logic در index.html) |
| **Local serve** | `npx serve .` |

### وابستگی‌ها

- **Upstream**: Backend API (`VITE_API_BASE`), WhatsApp API (`WHATSAPP_API_BASE`)
- **Downstream**: هیچ
- **وضعیت جاری**: ⚠️ **هشدار** — ۱۸ فایل ردیابی‌شده از دیسک حذف شده (vercel.json, .gitignore, icons, manifest, test files, bak files)

---

## 5. Messenger App

| فیلد | مقدار |
|------|-------|
| **مسیر** | `messenger-app/` |
| **Git origin** | `github.com/bozorgmehr1355/messenger-app` (nested repo مستقل) |
| **نوع** | SPA — React + JSX (CDN, Babel standalone) |
| **Runtime dependencies** | React از CDN — `node_modules` موجود ولی قدیمی (stale) |
| **وضعیت node_modules** | ⚠️ وجود دارد (اما ۱۴ ماژول core از دیسک حذف شده) |
| **پکیج منیجر** | ندارد (بدون package.json) |

### Environment Variables

بدون env var runtime (hardcoded `supabaseUrl` و `supabaseKey` در `index.html`).

### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health endpoint** | ❌ **مستقر نیست** — `https://messenger-app.vercel.app/` → صفحه خالی |
| **Syntax check** | قابل اجرا نیست (JSX) |
| **Local serve** | `npx serve .` |

### وابستگی‌ها

- **Upstream**: Supabase, Backend API
- **Downstream**: هیچ
- **وضعیت جاری**: 🔴 **خراب جدي** — همه ۱۴ ماژول core (CRM, Chat, Letters, Notifications, OrgChart, Payments, Projects, Requests, Admin) + ۴ فایل دیگر از دیسک حذف شده‌اند

---

## ماتریس وابستگی‌ها

```
تغیر در این سرویس     ↓    باید این سرویس‌ها را چک کند
─────────────────────     ──────────────────────────────
backend                   wholesale-portal, admin-panel, messenger-app, whatsapp-broadcast-api
whatsapp-broadcast-api    (هیچ downstream — ولی webhook smoke ضروری)
wholesale-portal          backend (مصرف‌کننده API)
admin-panel               backend (مصرف‌کننده API)
messenger-app             backend (مصرف‌کننده API)
```

---

## قوانین تغییر

1. **تغییر در backend**: حتماً `npm run check:preflight` + smoke تست backend + چک دستی wholesale portal و messenger app
2. **تغییر در whatsapp-broadcast-api**: حتماً webhook POST smoke + بررسی intent pipeline
3. **تغییر در env docs**: حتماً DB source gate عبور کند
4. **تغییر در SERVICE_CONTRACTS**: همه سرویس‌ها re-check شوند
5. **هیچ سرویسی بدون ثبت در health matrix به عنوان OK اعلام نشود**
