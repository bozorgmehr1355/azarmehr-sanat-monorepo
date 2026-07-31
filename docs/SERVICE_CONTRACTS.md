# Service Contracts — Azarmehr Sanat Monorepo

> آخرین به‌روزرسانی: ۹ مرداد ۱۴۰۵
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
| **Syntax check** | `node -c <file>` (همه فایل‌های JS از جمله ۶ فایل جدید فاز ۱ ✅) |
| **Local start** | `node server.js` (یا `npm run dev`) |
| **Test** | `node test-tasks-meetings-ai-smoke.js` (۱۶ سناریوی فاز ۱ ✅) |
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

---

## Support Tickets API Contract

> قرارداد رسمی endpoint: `/api/support-tickets`
> آخرین به‌روزرسانی: ۱۴۰۵ (این مرحله — ثبت قرارداد، بدون تغییر backend/database)

### 1. وضعیت قرارداد

- این قرارداد **جدید** است و طبق قانون Contract-First ثبت می‌شود.
- وضعیت فعلی پیاده‌سازی backend **کامل نیست**: handler موجود (`backend/handlers/support-tickets.js`) فقط `POST` (احراز هویت مشتری) را دارد و به دلیل نبود جدول در Source of Truth، پاسخ کنترل‌شده `503` برمی‌گرداند.
- `GET` و `PATCH` (مورد نیاز ادمین) در backend **پیاده‌سازی نشده‌اند** (درخواست غیر‑POST → `405`).
- **migration دیتابیس ساخته شده است** اما **هنوز اجرا نشده است**: فایل `supabase/create-support-tickets.sql` (جدول `public.support_tickets`) در Source of Truth موجود است؛ اجرای آن نیازمند approval جداگانهٔ مالک است.
- تا زمان تکمیل backend و database، این endpoint **نباید production-ready تلقی شود**.

### 2. نقش‌های دسترسی

#### مشتری (Customer)

- **متد مجاز:** `POST` تنها
- **احراز هویت:** customer authentication — همان سازوکار رسمی پروژه (`requireAuth` در `backend/handlers/_lib.js`، Bearer token از `Authorization`)
- مشتری فقط مجاز است تیکت متعلق به **خودش** را ایجاد کند؛ هویت از توکن استخراج می‌شود نه از body.
- مشتری **نباید** بتواند `ticket_id`، شناسه مالک دیگران، `role`، `created_at`، `updated_at` یا فیلدهای سیستمی را تعیین کند.

#### ادمین (Admin)

- **متدهای مجاز:** `GET` و `PATCH`
- **احراز هویت:** admin authentication — همان سازوکار رسمی (`requireAdmin` → `requireRole(['super_admin','admin'])`)
- `GET` فقط تیکت‌هایی را برمی‌گرداند که نقش ادمین اجازهٔ مشاهدهٔ آن‌ها را دارد (در پیاده‌سازی نهایی از طریق RLS / فیلتر سمت سرور).
- `PATCH` فقط برای تغییر فیلدهای مجاز مدیریتی (مثلاً `status`, `admin_notes`) باشد.
- مالکیت، audit fields و فیلدهای سیستمی **نباید** از ورودی خام کاربر قابل جعل باشند.

### 3. POST request (ایجاد تیکت توسط مشتری)

- **Content-Type:** `application/json`
- **فیلدهای ورودی (بر اساس handler فعلی `support-tickets.js`):**

| فیلد | نوع | وضعیت | ملاحظات |
|------|-----|--------|----------|
| `subject` | string | required | غیرخالی؛ حد طول: TBD (در repo تعریف نشده) |
| `message` | string | required | غیرخالی؛ معادل توضیح تیکت؛ حد طول: TBD |
| `category` | string | optional | مقدارهای مجاز (از admin-panel `CATEGORY_LABELS`): `order_tracking`, `order_question`, `warranty`, `payment`, `other`؛ پیش‌فرض `order_tracking` |
| `order_id` | number | optional | شناسه سفارش مرتبط؛ اگر خالی باشد `null` در نظر گرفته می‌شود |
| `priority` | string | TBD | در repo اثبات نشده؛ تعریف نشده |
| `description` | string | TBD | در repo اثبات نشده (هم‌اکنون `message` استفاده می‌شود) |
| `attachments` / `metadata` | — | TBD | در repo اثبات نشده |

- **هویت:** `user.id` از توکن استخراج می‌شود؛ هرگز از body گرفته نمی‌شود.
- **رفتار در نبود body / JSON نامعتبر:** `400` (پیام: `subject and message are required`)
- **رفتار در نبود فیلدهای الزامی:** `400`
- **وضعیت فعلی:** به دلیل نبود جدول، handler پاسخ `503` کنترل‌شده برمی‌گرداند (پیام: `سامانه پشتیبانی در حال راه‌اندازی است`).

### 4. GET request (فهرست تیکت‌ها — ادمین)

- **احراز هویت:** admin Bearer token (`requireAdmin`)
- **Query parameters (بر اساس مصرف‌کنندهٔ فعلی admin-panel):**
  - `order=created_at.desc` — مرتب‌سازی نزولی بر اساس `created_at` (تأیید شده در admin-panel)
  - سایر فیلترها (limit، pagination، filter بر اساس status/priority/category، search) در repo اثبات نشده → **TBD**
- **شکل response موفق:** آرایهٔ مستقیم (direct JSON array) از آبجکت‌های تیکت — admin-panel صریحاً `Array.isArray(r)?r:[]` را انتظار دارد.
- **فیلدهای خوانده‌شده توسط UI (تأیید شده):** `id`, `user_id` (در UI ممکن است با نام `customer_id` نمایش داده شود — فقط alias/UI wording است؛ ستون رسمی `public.support_tickets.user_id` است), `status`, `admin_notes`, `subject`, `updated_at`
- **وضعیت فعلی:** backend فقط `405` برمی‌گرداند (پیاده‌سازی نشده).

### 5. PATCH request (به‌روزرسانی تیکت — ادمین)

- **Content-Type:** `application/json`
- **شناسه تیکت:** از query parameter به فرم `id=eq.<numeric_id>` (تأیید شده در admin-panel: `support-tickets?id=eq.`+id)
- **فیلدهای قابل تغییر (تأیید شده در admin-panel `saveDetail`):**
  - `status` — مقادیر مجاز طبق `STATUS_MAP` در admin-panel: `open`, `in_progress`, `resolved`, `closed` (lifecycle دقیق در repo اثبات نشده → TBD)
  - `admin_notes` — یادداشت/پاسخ ادمین
- **ممنوعیت:** تغییر `id`، مالک/مشتری (`user_id`؛ اگر UI از نام `customer_id` استفاده کند فقط یک نام‌نمایی است که باید به `user_id` map شود)، `created_at`، `updated_at` و سایر audit fields از طریق ورودی عادی ممنوع است.
- **رفتار ticket ناموجود:** TBD (مورد انتظار `404` یا `200` با رکورد خالی — باید در پیاده‌سازی تعیین شود)
- **رفتار body نامعتبر:** `400`
- **رفتار transition نامعتبر:** TBD (اگر lifecycle تعریف شود)
- **وضعیت فعلی:** backend فقط `405` برمی‌گرداند (پیاده‌سازی نشده).

### 6. Response contract

ساختار خطای ثابت (مطابق handler فعلی و سایر endpointهای پروژه):

```json
{ "error": "<message>" }
```

در صورت نیاز به جزئیات بیشتر: `{ "error": "<message>", "details": "..." }` (اختیاری).

| متد | وضعیت | کد HTTP | توضیح |
|-----|-------|---------|-------|
| POST | موفقیت | `200` / `201` | پس از ایجاد جدول و پیاده‌سازی (هم‌اکنون: `503`) |
| POST | ورودی نامعتبر | `400` | `subject and message are required` |
| POST | عدم احراز هویت | `401` | `لطفاً وارد شوید` |
| POST | منبع پیدا نشد / وابستگی DB | `503` | هم‌اکنون (جدول موجود نیست)؛ پس از ایجاد جدول `500` در صورت خطای DB |
| GET | موفقیت | `200` | آرایهٔ مستقیم (ادمین) |
| GET | عدم احراز هویت / عدم دسترسی | `401` / `403` | `requireAdmin` |
| PATCH | موفقیت | `200` | رکورد به‌روزرسانی‌شده |
| PATCH | عدم احراز هویت / عدم دسترسی | `401` / `403` | `requireAdmin` |
| PATCH | ورودی نامعتبر | `400` | |
| همه | متد غیرمجاز | `405` | هر متدی غیر از مجاز برای هر نقش |

> کدهای دقیق `404` (ticket ناموجود در PATCH) و `500` (خطای DB) تا پیاده‌سازی نهایی **TBD** باقی می‌مانند.

### 7. مدل داده پیشنهادی قرارداد (قرارداد API — نه migration)

#### فیلدهای سیستمی

| فیلد | نوع | وضعیت |
|------|-----|--------|
| `id` | uuid | required (PK) — نام از admin-panel تأیید شده |
| `user_id` | uuid | required — هویت مالک از توکن (تأیید شده؛ ستون رسمی schema `public.support_tickets.user_id`) |
| `created_at` | timestamp | سیستمی |
| `updated_at` | timestamp | سیستمی (تأیید شده در admin-panel) |
| `resolved_at` / `closed_at` | timestamp | TBD (در repo اثبات نشده) |

#### فیلدهای مشتری

| فیلد | نوع | وضعیت |
|------|-----|--------|
| `subject` | string | required (تأیید شده) |
| `message` | string | required — توضیح تیکت (تأیید شده) |
| `category` | string | optional — مقادیر مجاز تأیید شده (بخش ۳) |
| `priority` | string | TBD |
| `attachments` / `metadata` | json | TBD |

#### فیلدهای مدیریتی

| فیلد | نوع | وضعیت |
|------|-----|--------|
| `status` | string | required — مقادیر مجاز: `open`, `in_progress`, `resolved`, `closed` (تأیید شده در admin-panel) |
| `admin_notes` | text | optional — یادداشت/پاسخ ادمین (تأیید شده) |
| `assigned_admin` | — | TBD (در repo اثبات نشده) |

### 8. POST /api/support-tickets — Contract رسمی (مستقل)

> این بخش **فقط قرارداد `POST`** را به صورت متمرکز و قطعی تعریف می‌کند (مکمل بخش ۳).
> ثبت می‌شود پیش از هر تغییر کد backend — طبق قانون Contract-First.

#### 1) Endpoint
- `POST /api/support-tickets`

#### 2) Method
- `POST` (ایجاد تیکت توسط مشتری)

#### 3) Auth requirement
- **احراز هویت اجباری:** Customer auth — `requireAuth` در `backend/handlers/_lib.js` (Bearer token از هدر `Authorization`).
- بدون توکن معتبر → `401`.
- هویت مالک (`user_id`) **فقط** از توکن استخراج می‌شود؛ هرگز از body گرفته نمی‌شود.
- مشتری نباید بتواند فیلدهای سیستمی (`id`, `user_id`, `created_at`, `updated_at`, `status`, `admin_notes`) را از ورودی تعیین کند.

#### 4) Request body fields
| فیلد | نوع | وضعیت | ملاحظات |
|------|-----|--------|----------|
| `subject` | string | required | غیرخالی؛ عنوان تیکت |
| `message` | string | required | غیرخالی؛ متن/توضیح تیکت (ستون مقصد: `description`) |
| `category` | string | optional | مقادیر مجاز: `order_tracking`, `order_question`, `warranty`, `payment`, `other`؛ پیش‌فرض `order_tracking` |
| `order_id` | number | optional | شناسه سفارش مرتبط؛ خالی → `null` |
| `priority` | string | optional (TBD) | در repo اثبات نشده؛ در صورت ارسال نادیده گرفته می‌شود تا تعریف شود |
| `attachments` / `metadata` | json | optional (TBD) | در repo اثبات نشده؛ در صورت ارسال نادیده گرفته می‌شود |

- **Content-Type:** `application/json`
- در صورت نبود body یا JSON نامعتبر → `400`.

#### 5) Validation rules
- `subject`: required، non-empty (trim شده)، کد `400` در صورت خالی.
- `message`: required، non-empty (trim شده)، کد `400` در صورت خالی.
- `category`: اختیاری؛ اگر فرستاده شد باید یکی از مقادیر مجاز باشد وگرنه `400`.
- `order_id`: اختیاری؛ اگر فرستاده شد باید عدد باشد وگرنه `400`.
- تمام فیلدهای سیستمی و مدیریتی از ورودی نادیده گرفته می‌شوند (هیچ override مجاز نیست).
- پیام خطای ورودی نامعتبر: `subject and message are required`.

#### 6) Success response schema
- کد: `201 Created` (پس از ایجاد جدول و فعال‌سازی backend؛ هم‌اکنون `503` — ببخش §۹ پایین).
- body:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "subject": "string",
  "description": "string",
  "status": "open",
  "admin_notes": null,
  "created_at": "timestamptz",
  "updated_at": "timestamptz"
}
```

#### 7) Error response schema
- ساختار خطای ثابت پروژه:
```json
{ "error": "<message>" }
```
- در صورت نیاز: `{ "error": "<message>", "details": "..." }` (اختیاری).
- پیام‌های خطا:
  - `401`: `لطفاً وارد شوید`
  - `400`: `subject and message are required`
  - `503`: `سامانه پشتیبانی در حال راه‌اندازی است` (هم‌اکنون — جدول موجود نیست)

#### 8) Expected status codes
| کد | معنی |
|----|------|
| `201` | ایجاد موفق (پس از فعال‌سازی) |
| `400` | ورودی نامعتبر / فیلدهای الزامی خالی |
| `401` | عدم احراز هویت مشتری |
| `503` | هم‌اکنون — وابستگی دیتابیس (جدول `public.support_tickets` اجرا نشده)؛ پس از ایجاد جدول، خطای DB → `500` |
| `405` | در صورت استفاده از متد غیرمجاز روی این endpoint |

#### 9) Mapping to public.support_tickets columns
| فیلد body | ستون جدول | نوع | توضیح |
|-----------|-----------|-----|-------|
| (از توکن) | `user_id` | uuid NOT NULL | هویت مالک از `auth.uid()` / `user.id` |
| `subject` | `subject` | text NOT NULL | عنوان |
| `message` | `description` | text NOT NULL | متن تیکت |
| — | `status` | text NOT NULL DEFAULT 'open' | همیشه `open` در ایجاد (CHECK: open/in_progress/resolved/closed) |
| — | `admin_notes` | text NULL | همیشه `NULL` در ایجاد |
| — | `id` | uuid PK DEFAULT gen_random_uuid() | سیستمی |
| — | `created_at` | timestamptz NOT NULL | سیستمی (DEFAULT utc now) |
| — | `updated_at` | timestamptz NOT NULL | سیستمی (DEFAULT utc now + trigger) |
| `category` / `order_id` / `priority` | (ستون ندارد) | — | هم‌اکنون بدون ستون dedicated؛ اگر لازم شود در migration جداگانه اضافه می‌شود (خارج از scope این قرارداد) |

> نکته: `category` و `order_id` در schema فعلی ستون ندارند؛ اگر نیاز قطعی شد، تغییر schema باید در migration جداگانه و با approval مالک انجام شود. قرارداد فعلی آن‌ها را فقط به عنوان ورودی اختیاری می‌پذیرد و تا تعریف ستون، نادیده می‌گیرد یا در `metadata` (TBD) ذخیره می‌کند.

#### 10) Note: POST implementation is pending backend activation
- پیاده‌سازی `POST` در handler موجود (`backend/handlers/support-tickets.js`) حضور دارد اما **فعال نیست** و هم‌اکنون پاسخ کنترل‌شده `503` (`سامانه پشتیبانی در حال راه‌اندازی است`) برمی‌گرداند، زیرا جدول `public.support_tickets` در دیتابیس اجرا نشده است.
- فعال‌سازی واقعی `POST` منوط به: (الف) اجرای migration `supabase/create-support-tickets.sql` (با approval مالک) و (ب) تایید backend برابر این قرارداد (تطبیق `message` → `description` و سایر قواعد بالا).
- تا پیش از فعال‌سازی، این endpoint **production-ready نیست**.

### Current Implementation Gap

- handler فعلی backend (`backend/handlers/support-tickets.js`) با قرارداد کامل `GET`/`PATCH` ادمین **منطبق نیست** (فقط `POST` پیاده‌سازی شده؛ سایر متدها `405`).
- جریان فعلی `POST` مشتری باید با قرارداد جدید (بخش ۳) تطبیق داده شود؛ هم‌اکنون به دلیل نبود جدول پاسخ `503` کنترل‌شده برمی‌گرداند.
- جدول `public.support_tickets` در فایل migration `supabase/create-support-tickets.sql` (Source of Truth) **ساخته شده است اما هنوز اجرا نشده است** (نیازمند approval جداگانهٔ مالک).
- **ایجاد migration یک مرحلهٔ جداگانه است و در این مرحله انجام نمی‌شود.**
- **پیاده‌سازی backend (افزودن GET/PATCH ادمین) نیز یک مرحلهٔ جداگانه است و در این مرحله انجام نمی‌شود.**

### Current Status (وضعیت فعلی — همسان‌سازی با migration)

- **contract:** exists — `Support Tickets API Contract` برای `/api/support-tickets` ثبت شده است (شامل POST / GET / PATCH).
- **migration file:** exists at `supabase/create-support-tickets.sql` (جدول `public.support_tickets`).
- **migration execution:** NOT executed yet — اجرای آن نیازمند approval جداگانهٔ مالک است.
- **backend GET/PATCH:** still pending — فقط `POST` پیاده‌سازی شده؛ `GET`/`PATCH` ادمین هنوز پیاده‌سازی نشده‌اند (درخواست غیر‑POST → `405`).
- **deploy:** NOT done.
- **owner approval:** اجرای migration و deploy هر دو نیازمند تأیید جداگانهٔ مالک هستند.
- **schema owner column:** ستون رسمی `public.support_tickets.user_id` است. اگر UI یا legacy wording از `customer_id` استفاده کند، backend باید آن را به `user_id` دیتابیس map کند؛ schema رسمی `public.support_tickets.user_id` است و تغییر نمی‌کند.

---

## 6. Phase 1 — Tasks / Meetings / AI Agent (فاز ۱)

> قرارداد رسمی فاز ۱: مدیریت تسک‌ها با شواهد، صورتجلسات و موتور Omnichannel AI Agent.
> آخرین به‌روزرسانی: ۹ مرداد ۱۴۰۵
> مایگریشن‌ها: `supabase/migrations/20260731000000_init_phase1_tables.sql`،
> `20260731000001_ai_drafts_phase1.sql`، `20260731000002_grant_phase1_tables.sql`،
> `20260731000003_enable_rls_phase1.sql`

### 6.1 وضعیت قرارداد

- پیاده‌سازی **کامل و فعال** — smoke test ۱۶ سناریو ✅ (تسک، شواهد، صورتجلسه، تبدیل اکشن‌آیتم، موتور AI، گیت احراز هویت، ناهماهنگی روت)
- RLS روی هر ۵ جدول فعال است (**deny-all**)؛ دسترسی فقط از طریق بک‌اند با `service_role` (دارای BYPASSRLS)

### 6.2 مسیرها و قرارداد

| مسیر | متد | نقش | پاسخ موفق | توضیح |
|------|-----|-----|-----------|-------|
| `/api/tasks` | `POST` | admin | `201` | ایجاد تسک — وضعیت اولیه `PENDING_ACK` |
| `/api/tasks` | `GET` | auth | `200` | لیست تسک‌ها — فیلتر: `status`, `assigneeId`/`assignee_id`, `orderId`/`order_id` |
| `/api/tasks/:id` | `GET` | auth | `200` | جزئیات تسک + شواهد |
| `/api/tasks/:id/status` | `PATCH` | auth | `200` | تغییر وضعیت — انتقال به `PENDING_REVIEW` نیازمند حداقل یک شاهد |
| `/api/tasks/:id/evidence` | `POST` | auth | `201` | ثبت شاهد (`evidenceType` الزامی) |
| `/api/meetings` | `POST` | admin | `201` | ثبت صورتجلسه (مالک هندلر جدید `meeting-minutes`) |
| `/api/meetings` | `GET` | auth | `200` | لیست صورتجلسات |
| `/api/meetings/:id/convert-action-item` | `POST` | admin | `201` | تبدیل اکشن‌آیتم انتخابی به تسک رسمی |
| `/api/ai-agent/process-notes` | `POST` | auth | `201` | استخراج از متن خام → پیش‌نویس `DRAFT` |
| `/api/ai-agent/drafts/:id/approve` | `POST` | admin | `200` | تأیید انسانی → ایجاد صورتجلسه رسمی |
| `/api/ai-agent/drafts/:id/reject` | `POST` | admin | `200` | رد پیش‌نویس + دلیل |

### 6.3 وضعیت‌های تسک و اولویت

- چرخه زندگی: `PENDING_ACK` ← `ACKNOWLEDGED` ← `IN_PROGRESS` ← `PENDING_REVIEW` ← `APPROVED` / `REJECTED` / `BLOCKED`
- اولویت‌ها: `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` (پیش‌فرض `MEDIUM`)

### 6.4 قانون حاکمیتی AI

- خروجی موتور AI هرگز مستقیم در جدول رسمی نوشته نمی‌شود — همیشه در `ai_drafts` با وضعیت `DRAFT` ذخیره می‌شود.
- فقط پس از `approve` توسط ادمین، رکورد رسمی در `meeting_minutes` ایجاد می‌شود.
- `approve`/`reject` تکراری → `400` با پیام فارسی.

### 6.5 جدول‌های دیتابیس

| جدول | توضیح | RLS |
|------|-------|-----|
| `tasks` | تسک‌ها (رابطه با `task_evidences`) | ✅ فعال (deny-all) |
| `task_evidences` | شواهد تسک | ✅ فعال |
| `meeting_minutes` | صورتجلسات رسمی + اکشن‌آیتم‌ها (JSONB) | ✅ فعال |
| `audit_logs` | لاگ تغییرات (اسکیمای فاز ۱: `action`/`changes`) | ✅ فعال |
| `ai_drafts` | پیش‌نویس‌های موتور AI | ✅ فعال |

### 6.6 احراز هویت و خطا

- همه مسیرها ابتدا `requireAuth`؛ عملیات مدیریتی (ایجاد تسک/صورتجلسه، تبدیل اکشن‌آیتم، approve/reject) نیازمند `requireAdmin`.
- ساختار خطای ثابت: `{ "error": "<پیام فارسی>" }`
- کدها: `400` ورودی نامعتبر (اعتبارسنجی zod)، `401` بدون توکن، `404` منبع یافت نشد، `405` متد/مسیر نامجاز (شامل زیرمسیرهای legacy)، `500` خطای ناشناخته.

### 6.7 Health & Smoke

| نوع | دستور |
|-----|-------|
| **Smoke test** | `node backend/test-tasks-meetings-ai-smoke.js` (۱۶ ✅ / ۰ ❌) |
| **اعتبارسنجی ورودی** | zod — `backend/services/validation.js` |
| **Audit** | تمام تغییرات وضعیت/ایجاد در `audit_logs` ثبت می‌شود |

### 6.8 وابستگی‌ها

- **Upstream:** Supabase (جدول‌های فاز ۱)
- **Downstream:** هیچ مصرف‌کننده‌ای در ریپو فعلاً این روت‌ها را صدا نمی‌زند (اتصال UI = مرحله بعد)
- **قانون تغییر:** تغییر runtime → حتماً `npm run check:preflight` + smoke test + بررسی downstream

---

## 7. Omnichannel Adapters

> قرارداد رسمی کانال‌های ارتباطی چندگانه (Omnichannel).
> هر adapter یک سرویس مستقل ورودی/خروجی است که منطق کسب‌وکار را به کانال خاص متصل می‌کند.
> خود منطق کسب‌وکار (intent detection, CRM, order management) در `backend/` متمرکز است و channel-agnostic می‌ماند.

### اصول معماری مشترک (همه adapterها)

1. **Input normalization:** هر adapter پیام ورودی کانال را به یک ساختار نرمال‌شده (channel-agnostic) تبدیل می‌کند.
2. **Output model:** همه adapterها از Response Model یکسان مصرف می‌کنند: `whatsapp-broadcast-api/shared/response-model.js` (فیلدهای `intent`, `channel`, `text`, `blocks`, `metadata`, `suggestedActions`, `stateTransition`).
3. **Business logic در adapter ممنوع:** هیچ adapter نباید intent detection, CRM query, یا decision logic مستقل داشته باشد — همه باید `backend/` را صدا بزنند.
4. **Human-in-the-loop:** عملیات حساس (ارسال پیام به مشتری، تغییر وضعیت سفارش، بازگشت وجه) نیازمند تأیید انسانی هستند — adapter فقط درخواست را صف می‌کند، اجرا نمی‌کند.
5. **Price policy:** ارسال قیمت مستقیم در کانال‌های پیام‌رسان ممنوع — فقط هدایت به پورتال (طبق AGENTS.md).
6. **Identity:** هر adapter شماره موبایل مشتری را به‌عنوان primary key شناسایی هویت ارسال می‌کند.
7. **Audit:** همه تراکنش‌های adapter در جدول `communication_logs` (یا معادل) ثبت می‌شود.

---

### 7.1 Bale Adapter

| فیلد | مقدار |
|------|-------|
| **وضعیت** | ✅ پیاده‌سازی شده — فعال |
| **مسیر** | `bale-adapter/` (۲ فایل: `bale-text-renderer.js` + `bale-webhook-handler.js`) |
| **نوع** | Express handler داخل `backend/server.js` — Bale Bot API Webhook |
| **Node.js** | CommonJS |
| **Runtime owner** | `backend/server.js` — handler در همین پروژه mount می‌شود |
| **ورودی** | Webhook POST از Bale Bot API (فرمت JSON استاندارد Bale — مشابه Telegram Bot API) |
| **خروجی** | Response Model → `renderBaleMessage()` → Bale Rich Format (متن + دکمه `inline_keyboard`) |
| **احراز هویت ورودی** | هدر `x-bale-webhook-secret` مطابق `BALE_WEBHOOK_SECRET` (webhook secret — **نه** JWT کاربر) |
| **احراز هویت خروجی** | ندارد (adapter مستقیماً با backend از طریق HTTP داخلی صحبت می‌کند) |
| **کانال‌های پشتیبانی‌شده** | متن، دکمه (inline_keyboard)، تصویر، صوت، سند، استیکر |
| **Idempotency** | ✅ `update_id` — in-memory deduplication با TTL ۵ دقیقه (`isDuplicateUpdate()`) |
| **مستندات فنی** | `bale-adapter/bale-webhook-handler.js` — ۴۴۱ خط، ۱۴ تست unit/integration ✅ |

#### Environment Variables (Runtime)

| متغیر | نقش | منبع |
|-------|------|------|
| `BALE_BOT_TOKEN` | توکن ربات Bale | ✅ مجاز — از BotFather |
| `BALE_WEBHOOK_SECRET` | رمز تأیید webhook (مقایسه با هدر `x-bale-webhook-secret`) | ✅ مجاز — ترجیحاً با `BOT_TOKEN` متفاوت |
| `ORCHESTRATOR_URL` | آدرس endpoint orchestrator (پیش‌فرض: `http://localhost:3000/api/message-orchestrator`) | ✅ مجاز — برای محیط production روی Vercel تنظیم شود |
| `ORCHESTRATOR_TIMEOUT_MS` | مهلت انتظار orchestrator (پیش‌فرض: ۱۰۰۰۰) | ✅ مجاز — اختیاری |
| `SUPABASE_URL` | آدرس پروژه Supabase | ✅ مجاز — اشتراکی |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سرویس | ✅ مجاز — اشتراکی |
| `JWT_SECRET` | رمز توکن‌های JWT | ✅ مجاز — اشتراکی |

#### Runtime Contract (Webhook Endpoint)

> قرارداد رسمی mount شدن Bale webhook handler در `backend/server.js`.

##### ۱) Endpoints

| مسیر | متد | کاربرد |
|------|------|--------|
| `/api/bale/webhook` | `POST` | دریافت webhook update از Bale Bot API |
| `/api/bale/webhook` | `GET` | health check adapter |
| `/api/bale/webhook` | `OPTIONS` | CORS preflight |

##### ۲) Auth (Webhook Validation)

- **مکانیزم:** هدر `x-bale-webhook-secret` در برابر `BALE_WEBHOOK_SECRET` env var بررسی می‌شود.
- **عدم تطابق:** `401` با body `{ "error": "invalid_webhook_secret" }`.
- **نبود هدر:** `401` با body `{ "error": "missing_webhook_secret" }`.
- **عدم استفاده از JWT کاربر:** اعتبارسنجی webhook **کاملاً مجزا** از لاگین کاربران است — این endpoint از `requireAuth` یا `requireAdmin` استفاده نمی‌کند. ربات Bale یک سرویس است، نه یک کاربر انسانی.
- **OPTIONS:** بدون اعتبارسنجی — بلافاصله `200` برمی‌گردد.

##### ۳) POST /api/bale/webhook — Request

- **Content-Type:** `application/json`
- **Body:** همان ساختار استاندارد Bale Bot API webhook update:
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": { "id": 987654321, "first_name": "کاربر", "is_bot": false },
    "chat": { "id": 987654321, "type": "private" },
    "date": 1700000000,
    "text": "سلام"
  }
}
```
- پشتیبانی از `message`, `edited_message`, `channel_post` (سایر انواع مانند `callback_query` نادیده گرفته می‌شوند با `skipped: true`).
- پشتیبانی از `photo`, `document`, `voice`, `sticker` به عنوان attachment.

##### ۴) POST /api/bale/webhook — Processing Pipeline

```
Bale webhook body
  → normalizeBaleUpdate()        (عادی‌سازی به NormalizedRequest)
  → POST /api/message-orchestrator   (business logic)
  → validateOrchestratorResponse()
  → quickReplies → suggestedActions  (mapping field names)
  → renderBaleMessage()              (Response Model → Bale format)
  → response JSON
```

- **بدون business logic در adapter:** همه intent detection, decision, response generation در orchestrator انجام می‌شود.
- **fallback امن:** اگر orchestrator در دسترس نباشد یا timeout بخورد، adapter پاسخ fallback برمی‌گرداند (`ok: true` با پیام خطای عمومی — بدون stack trace).

##### ۵) POST /api/bale/webhook — Response (Success)

- **HTTP 200** (همیشه — برای Ack به Bale Bot API)
- **Response body:**
```json
{
  "ok": true,
  "correlation_id": "bale_abc123_def456",
  "baleResponse": {
    "text": "سلام! به گروه محصولات غذایی عقرب خوش آمدید.\nچطور می‌توانم به شما کمک کنم؟",
    "parse_mode": "Markdown",
    "reply_markup": {
      "inline_keyboard": [
        [
          { "text": "🛒 مشاهده محصولات", "callback_data": "products" },
          { "text": "📞 تماس با پشتیبانی", "callback_data": "contact" },
          { "text": "ℹ️ راهنما", "callback_data": "help" }
        ]
      ]
    }
  }
}
```
- `correlation_id`: شناسه همبستگی (پیشوند `bale_`).
- `baleResponse`: ساختار قابل ارسال مستقیم به Bale Bot API `sendMessage`.

##### ۶) POST /api/bale/webhook — Response (Error / Fallback)

| سناریو | HTTP | Response |
|--------|------|----------|
| خطای normalize (ورودی نامعتبر) | `200` | `{ ok: false, error: "normalization_failed" }` |
| orchestrator در دسترس نیست | `200` | `{ ok: true, baleResponse: { text: "..." }, error: "orchestrator_unreachable" }` |
| خطای render | `200` | `{ ok: true, baleResponse: { text: "..." }, error: "render_failed" }` |
| update تکراری (dedup) | `200` | `{ ok: true, skipped: true, detail: "duplicate_update" }` |
| نوع update پشتیبانی‌نشده | `200` | `{ ok: true, skipped: true, detail: "unsupported_update_type" }` |

> همیشه HTTP 200 برای Ack webhook — Bale Bot API در صورت خطای غیر ۲۰۰ webhook را مجدداً ارسال می‌کند.

##### ۷) GET /api/bale/webhook — Health Check

- **HTTP 200**
- **Response body:**
```json
{
  "ok": true,
  "service": "bale-adapter",
  "status": "active",
  "timestamp": "2026-07-21T10:00:00.000Z"
}
```
- بدون نیاز به احراز هویت.
- برای monitoring و uptime check استفاده می‌شود.

##### ۸) خط‌مشی خطا (Error Policy)

1. **هرگز stack trace به caller برگردانده نمی‌شود.**
2. `correlation_id` در logها ثبت می‌شود (برای debugging).
3. پیام خطاهای عمومی، غیرحساس و بدون جزئیات پیاده‌سازی هستند.
4. خطاهای orchestrator در adapter log می‌شوند اما به Bale Bot API اعلام نمی‌شوند (همیشه ۲۰۰).
5. خطاهای `authentication (secret mismatch)` تنها استثنا هستند که `401` برمی‌گردانند (تا Bale webhook را مسدود کند).

##### ۹) جدول mount در server.js

| قرارداد | مقدار |
|---------|-------|
| **فایل mount** | `backend/server.js` |
| **handler منبع** | `require('./handlers/message-orchestrator').handler` (endpoint orchestrator) |
| **Bale handler mount** | ✅ — در `backend/server.js` با `app.all('/api/bale/webhook', ...)` mount شده است (خطوط ۱۸۱-۲۰۸) |
| **Bale handler فایل** | `bale-adapter/bale-webhook-handler.js` (exports: `handler`) |
| **Business logic endpoint** | `POST /api/message-orchestrator` (خود orchestrator که mount شده) |

> Bale webhook handler در `backend/server.js` mount می‌شود (نه در Vercel function مجزا)، زیرا باید از secrets و env vars backend اشتراکی استفاده کند.

##### ۱۰) قوانین تغییر

1. **تغییر در normalizeBaleUpdate:** حتماً ۸ سناریوی normalize تست شوند (null, text, photo, document, voice, sticker, group, callback_query).
2. **تغییر در fallback messages:** پیام‌های fallback نباید حاوی اطلاعات فنی یا stack trace باشند.
3. **تغییر در secret validation:** فقط از `BALE_WEBHOOK_SECRET` env var استفاده شود — هرگز hardcoded نشود.
4. **تغییر در business logic:** در `backend/handlers/message-orchestrator.js` انجام شود، **نه** در `bale-webhook-handler.js`.
5. **تغییر در idempotency:** `_dedupSet` فقط برای process lifetime است — در deployment‌های stateless باید با Redis/Supabase جایگزین شود.

#### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health endpoint** | `GET /api/bale/webhook` (در backend mount شده) |
| **Webhook verification** | `POST /api/bale/webhook` با payload شبیه‌سازیشده Bale + هدر `x-bale-webhook-secret` |
| **Syntax check** | `node -c bale-adapter/bale-webhook-handler.js` (✅) |
| **Unit tests** | `node -e "..."` — ۱۴ تست (normalize ۶ حالت + pipeline ۳ حالت + dedup + unsupported + null + group) ✅ |
| **Integration test** | POST به orchestrator (HTTP 200) → خروجی renderer با inline_keyboard ✅ |

#### وابستگی‌ها

- **Upstream:** Bale Bot API (webhook inbound), Backend API (`POST /api/message-orchestrator` برای business logic)
- **Downstream:** هیچ (outbound به کاربران Bale از طریق Bale Bot API calls)
- **منطق کسب‌وکار:** به `backend/handlers/message-orchestrator.js` واگذار شده — هیچ intent detection اختصاصی در adapter نیست.
- **وابستگی runtime:** backend باید روی پورت مشخص (`ORCHESTRATOR_URL`) در دسترس باشد.

---

### 7.2 Voice Adapter (تلفن / VoIP)

| فیلد | مقدار |
|------|-------|
| **وضعیت** | 📋 Proposed — پیاده‌سازی نشده |
| **مسیر** | `voice-adapter/` (جدید) |
| **نوع** | Vercel Serverless Functions — Webhook تلفنی (Twilio / VoIP داخلی) |
| **Node.js** | CommonJS |
| **ورودی** | Webhook از سرویس تلفنی (DTMF + ASR متن) |
| **خروجی** | Response Model → متن ساده (TTS یا SMS follow-up) |
| **احراز هویت ورودی** | امضای درخواست از سرویس تلفنی (Twilio signature / IP whitelist) |
| **احراز هویت خروجی** | Bearer token به backend (همان JWT پروژه) |

#### Environment Variables (Runtime)

| متغیر | نقش | منبع |
|-------|------|------|
| `TWILIO_ACCOUNT_SID` / `VOIP_API_KEY` | شناسه حساب تلفنی | ✅ مجاز — از سرویس تلفنی |
| `TWILIO_AUTH_TOKEN` / `VOIP_API_SECRET` | توکن سرویس تلفنی | ✅ مجاز |
| `TWILIO_PHONE_NUMBER` / `VOIP_NUMBER` | شماره تلفن سرویس | ✅ مجاز |
| `SUPABASE_URL` | آدرس پروژه Supabase | ✅ مجاز — اشتراکی |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سرویس | ✅ مجاز — اشتراکی |
| `JWT_SECRET` | رمز توکن‌های JWT | ✅ مجاز — اشتراکی |

#### محدودیت‌های خاص Voice

- **ورودی صوتی:** تشخیص خودکار گفتار (ASR) نیازمند سرویس خارجی است — در نسخه اول، فقط ورودی DTMF (فشردن دکمه) پشتیبانی می‌شود.
- **خروجی صوتی:** متن به گفتار (TTS) در نسخه اول استفاده نمی‌شود — پاسخ متنی از طریق SMS follow-up ارسال می‌شود.
- **قطع تماس:** adapter باید قطع تماس ناگهانی را مدیریت کند و لاگ تماس را ببندد.
- **Human handoff:** تماس به اپراتور انسانی در adapter پشتیبانی می‌شود (رده‌بندی شده).

#### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health endpoint** | TBD |
| **Smoke test** | POST با payload شبیه‌ساز DTMF |

#### وابستگی‌ها

- **Upstream:** سرویس تلفنی (Twilio یا VoIP داخلی), Backend API
- **Downstream:** SMS Adapter (برای follow-up متنی), Supabase
- **منطق تجاری:** backend/ — Voice adapter فقط ASR/DTMF → متن و بالعکس

---

### 7.3 SMS Adapter

| فیلد | مقدار |
|------|-------|
| **وضعیت** | 📋 Proposed — پیاده‌سازی نشده |
| **مسیر** | `sms-adapter/` (جدید) |
| **نوع** | Vercel Serverless Functions — Webhook از provider SMS (Kavenegar / Farazsms / ...) |
| **Node.js** | CommonJS |
| **ورودی** | Webhook از SMS provider (دریافت پیامک) یا API call از backend (ارسال پیامک) |
| **خروجی** | Response Model → متن ساده (API call به SMS provider) |
| **احراز هویت ورودی** | IP whitelist + API key |
| **احراز هویت خروجی** | API key SMS provider |

#### Environment Variables (Runtime)

| متغیر | نقش | منبع |
|-------|------|------|
| `SMS_PROVIDER` | نام provider (kavenegar, farazsms, ...) | ✅ مجاز |
| `SMS_API_KEY` | کلید API سرویس SMS | ✅ مجاز |
| `SMS_SENDER_NUMBER` | شماره ارسال‌کننده | ✅ مجاز |
| `SMS_WEBHOOK_SECRET` | کلید تأیید webhook دریافتی | ✅ مجاز |
| `SUPABASE_URL` | آدرس پروژه Supabase | ✅ مجاز — اشتراکی |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سرویس | ✅ مجاز — اشتراکی |

#### محدودیت‌های خاص SMS

- **بدون Rich UI:** SMS فقط متن ساده پشتیبانی می‌کند — بلوک‌های `menu`, `product_list`, `product_card` باید به متن خطی تبدیل شوند.
- **طول پیام:** محدودیت ۱۶۰ کاراکتر (UTF-8) — پیام‌های طولانی باید分段 شوند.
- **ورودی فقط از طریق keyword:** کاربر نمی‌تواند دکمه بزند — intent detection باید با keyword باشد.
- **هزینه:** هر پیامک هزینه دارد — adapter باید rate-limit و budget control داشته باشد.
- **ارسال یک‌طرفه عمدتاً:** SMS بیشتر برای notification و alert مناسب است تا گفتگو.

#### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health endpoint** | TBD |
| **Smoke test** | API call به provider برای ارسال تستی |

#### وابستگی‌ها

- **Upstream:** SMS Provider API, Backend API
- **Downstream:** هیچ
- **مصرف‌کننده اصلی:** backend/ (برای ارسال notification), Voice adapter (برای follow-up)

---

### 7.4 Email Adapter

| فیلد | مقدار |
|------|-------|
| **وضعیت** | 📋 Proposed — پیاده‌سازی نشده |
| **مسیر** | `email-adapter/` (جدید) |
| **نوع** | Vercel Serverless Functions — API ایمیل (SendGrid / Mailgun / SMTP) |
| **Node.js** | CommonJS |
| **ورودی** | Webhook ایمیل (Inbound Parse Webhook) یا API call از backend |
| **خروجی** | Response Model → HTML ایمیل |
| **احراز هویت ورودی** | امضای ایمیل (DKIM/SPF) + webhook secret |
| **احراز هویت خروجی** | API key سرویس ایمیل |

#### Environment Variables (Runtime)

| متغیر | نقش | منبع |
|-------|------|------|
| `EMAIL_PROVIDER` | نام provider (sendgrid, mailgun, ...) | ✅ مجاز |
| `EMAIL_API_KEY` | کلید API سرویس ایمیل | ✅ مجاز |
| `EMAIL_FROM_ADDRESS` | آدرس فرستنده | ✅ مجاز |
| `EMAIL_FROM_NAME` | نام نمایشی فرستنده | ✅ مجاز |
| `EMAIL_INBOUND_SECRET` | کلید تأیید webhook دریافتی | ✅ مجاز |
| `SUPABASE_URL` | آدرس پروژه Supabase | ✅ مجاز — اشتراکی |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سرویس | ✅ مجاز — اشتراکی |

#### محدودیت‌های خاص Email

- **با تأخیر:** ایمیل‌ها معمولاً با تأخیر ۱-۵ دقیقه می‌رسند — مناسب notification فوری نیست.
- **Rich HTML support:** امکان ارسال HTML (برخلاف SMS/WhatsApp) وجود دارد — `blocks` می‌توانند به HTML تبدیل شوند.
- **عدم قطعیت تحویل:** ایمیل ممکن است به spam برود — adapter باید bounce handling داشته باشد.
- **ورودی فقط از طریق reply:** کاربر به ایمیل reply می‌کند — adapter باید threading را مدیریت کند.
- **مناسب برای:** فاکتور رسمی، گزارشات دوره‌ای، اسناد (PDF پیوست)، خبرنامه.
- **پیوست:** adapter باید امکان پیوست PDF (فاکتور، قرارداد) را داشته باشد.

#### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health endpoint** | TBD |
| **Smoke test** | ارسال ایمیل تستی + تأیید تحویل |

#### وابستگی‌ها

- **Upstream:** Email Provider API, Backend API
- **Downstream:** هیچ
- **مصرف‌کننده اصلی:** backend/ (برای فاکتور، گزارش), Admin Panel (برای ارسال دستی)

---

### 7.5 Internal Messenger Adapter

> Internal Messenger (مسیر: `messenger-app/`) یک SPA React است که به کارمندان
> امکان گفتگوی داخلی، دریافت اعلان‌های سیستمی، و پاسخ به مشتریان از سایر کانال‌ها
> را می‌دهد. نقش آن در معماری Omnichannel **اپراتور داخلی** است — پلی بین
> adapterهای خارجی و تیم پشتیبانی.

| فیلد | مقدار |
|------|-------|
| **وضعیت** | ⚠️ موجود — adapter رسمی omnichannel تعریف نشده |
| **مسیر** | `messenger-app/` (SPA) + `backend/handlers/` (API) |
| **نوع** | React SPA + backend API endpoints (Supabase Realtime برای زنده‌نگاری) |
| **ساختار** | `messenger-app/app.jsx` (main), `components/`, `modules/`, `constants/` |
| **Node.js** | CommonJS (bundle) — React 18 + Supabase JS + Lucide Icons |
| **ورودی** | پیام از کانال‌های خارجی (WhatsApp, Bale, Voice, SMS, Email) که نیازمند پاسخ اپراتور است — از backend از طریق Supabase Realtime به messenger-app می‌رسد |
| **خروجی** | پاسخ اپراتور → backend → adapter مبدأ → مشتری |
| **احراز هویت** | backend API (`/api/login`) با Bearer token — احراز هویت کارمند |
| **اتصال بلادرنگ** | Supabase Realtime (WebSocket) — مشترک شدن روی کانال‌های chat, notifications |

#### Inbound Contract (ورود پیام به messenger-app)

پیام‌های ورودی به messenger-app از دو منبع می‌آیند:

| منبع | مکانیزم | ساختار |
|------|---------|--------|
| **Chat داخلی** | Supabase Realtime — subscription روی جدول `messages` | `{ thread_id, sender_id, text, attachments, created_at }` |
| **Notifications** | Supabase Realtime — subscription روی جدول `notifications` | `{ id, type, title, body, correlation_id, channel, priority, created_at }` |
| **Customer forward** | backend → درج در جدول `messages` با thread_id مشتری | `{ thread_id, customer_name, channel, text, attachments, original_channel_msg_id }` |

##### انواع رویدادهای ورودی

| رویداد | توضیح | ساختار |
|--------|-------|--------|
| **customer_message** | پیام جدید از مشتری (از هر کانال خارجی) که به اپراتور ارجاع شده | `{ event:"customer_message", thread_id, customer: {name, phone, channel}, text, attachments, channel_metadata }` |
| **employee_message** | پیام از همکار (چت داخلی) | `{ event:"employee_message", thread_id, sender_id, sender_name, text, attachments }` |
| **task_reminder** | یادآوری وظیفه (deadline نزدیک / اقدام لازم) | `{ event:"task_reminder", task_id, title, due_at, priority, order_id?, customer_id? }` |
| **escalation_alert** | اعلان escalation (مشتری منتظر است / کانال fallback مصرف شد) | `{ event:"escalation_alert", notification_id, original_channel, customer, priority, elapsed_minutes }` |
| **support_ticket_update** | به‌روزرسانی تیکت پشتیبانی | `{ event:"support_ticket_update", ticket_id, status, admin_notes, customer_name }` |
| **system_notification** | اعلان سیستمی (تغییر وضعیت سفارش، ثبت پرداخت، و...) | `{ event:"system_notification", type, title, body, correlation_id, priority }` |

##### فیلدهای مشترک پیام

| فیلد | نوع | الزامی | توضیح |
|------|-----|--------|-------|
| `event` | string | ✅ | نوع رویداد (مقادیر بالا) |
| `thread_id` | string (uuid) | ✅ | شناسه thread/gruppe گفتگو |
| `correlation_id` | string | خیر | شناسه همبستگی با رویداد اصلی (سفارش، مشتری، تیکت) |
| `text` | string | خیر | متن پیام |
| `attachments` | array | خیر | پیوست‌ها (تصویر، سند، فایل) — هر آیتم: `{ type, url, name, size }` |
| `metadata` | object | خیر | فراداده مخصوص channel مبدأ |
| `created_at` | string (ISO) | ✅ | زمان رویداد |

##### Attachments

| فیلد | نوع | الزامی | توضیح |
|------|-----|--------|-------|
| `type` | string | ✅ | `image`, `document`, `pdf`, `audio`, `video`, `other` |
| `url` | string | ✅ | آدرس فایل (به صورت محلی یا CDN) |
| `name` | string | خیر | نام نمایشی فایل |
| `size` | number | خیر | حجم فایل (bytes) |
| `thumbnail_url` | string | خیر | آدرس تصویر بندانگشتی (برای تصاویر) |

#### Outbound Contract (خروج پیام از messenger-app)

پیام‌های خروجی از messenger-app به سمت backend و نهایتاً به adapter کانال مقصد می‌روند.

| اقدام | مکانیزم | کانال مقصد |
|-------|---------|------------|
| **reply_to_customer** | backend → adapter مبدأ | WhatsApp / Bale / Voice / SMS / Email (مطابق کانال اصلی مشتری) |
| **internal_chat** | Supabase Realtime (direct insert) | همان messenger-app (کارمند دیگر) |
| **create_task** | backend → جدول `tasks` | messenger-app (اعلان به کارمند مسئول) |
| **approve_action** | backend → اجرای اقدام (تأیید بازگشت وجه، ارسال پیام، و...) | کانال مقصد اقدام |
| **escalate** | backend → escalation engine | تیکت پشتیبانی + اعلان به مدیر |

##### ساختار outbound برای reply_to_customer

```json
{
  "action": "reply_to_customer",
  "thread_id": "uuid_thread",
  "correlation_id": "uuid_original",
  "channel": "whatsapp",
  "recipient_id": "98912xxxxxxx",
  "text": "متن پاسخ اپراتور",
  "attachments": [],
  "operator_id": "uuid_operator",
  "operator_name": "محمد رضا",
  "created_at": "2026-07-21T10:00:00Z"
}
```

#### Reliability Rules

| قاعده | توضیح |
|-------|-------|
| **Low latency** | پیام‌های چت داخلی باید < ۱ ثانیه تحویل شوند (Supabase Realtime WebSocket)؛ اعلان‌های بحرانی < ۵ ثانیه |
| **Retry** | در صورت قطع WebSocket، client-side auto-reconnect با exponential backoff (۱ث, ۲ث, ۴ث, ۸ث, max ۳۰ث) |
| **Duplicate prevention** | هر `event` دارای `correlation_id` یکتاست — client-side dedupe بر اساس `correlation_id` در ۵ دقیقه اخیر |
| **Delivery tracking** | backend برای هر outbound پیام به کانال خارجی، `delivery_id` ثبت می‌کند و وضعیت را به messenger-app بازمی‌گرداند (`sent`, `delivered`, `failed`) |
| **Read tracking** | پیام‌های چت داخلی دارای رسید خواندن (seen_at) هستند — backend با PATCH روی جدول `messages` ثبت می‌کند |
| **correlation_id** | همه رویدادها (ورودی و خروجی) باید `correlation_id` داشته باشند تا یک مکالمه در سراسر کانال‌ها رهگیری شود |

#### Environment Variables (Runtime)

| متغیر | نقش | منبع |
|-------|------|------|
| `VITE_API_BASE_URL` | Base URL backend API | ✅ مجاز — در build time |
| `VITE_SUPABASE_URL` | آدرس پروژه Supabase | ✅ مجاز — در build time |
| `VITE_SUPABASE_ANON_KEY` | کلید anon (limited) | ✅ مجاز — فقط برای Realtime |
| `SUPABASE_URL` | آدرس پروژه Supabase | ✅ مجاز — اشتراکی (backend side) |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سرویس | ✅ مجاز — اشتراکی (backend side) |

> توجه: `messenger-app/` خود env var runtime ندارد (همه مقادیر در build زمان bundle می‌شوند).
> backend side از env vars اشتراکی Supabase/JWT استفاده می‌کند.

#### Health & Smoke

| نوع | دستور / آدرس |
|-----|-------------|
| **Health (front)** | صفحه لود می‌شود — `https://messenger-app.vercel.app/` |
| **Health (back)** | backend endpoints از طریق `VITE_API_BASE_URL` |
| **Realtime check** | subscription روی یک کانال test + تأیید تحویل پیام |
| **Smoke test** | ارسال پیام چت داخلی بین دو کاربر test + تأیید دریافت بلادرنگ |

#### وابستگی‌ها

- **Upstream:** Supabase (Realtime + DB), Backend API (authentication, business logic)
- **Downstream:** Backend (برای ارسال پاسخ به کانال‌های خارجی), Notification Engine (برای اعلان‌ها)
- **ارتباط با adapterها:** messenger-app **مصرف‌کننده نهایی** پیام‌های ارسالی از adapterهاست (از طریق backend) — خودش مستقیماً با adapterها ارتباط ندارد

---

### ماتریس قابلیت‌های کانال

| قابلیت | WhatsApp | Bale | Voice | SMS | Email | Messenger |
|---------|----------|------|-------|-----|-------|-----------|
| **وضعیت** | ✅ فعال | ✅ پیاده‌سازی شده | 📋 Proposed | 📋 Proposed | 📋 Proposed | ⚠️ موجود — adapter رسمی نشده |
| **متن** | ✅ | ✅ | ⚠️ (ASR محدود) | ✅ | ✅ | ✅ |
| **دکمه / Rich UI** | ✅ (شماره‌ای) | ✅ (Rich) | ❌ | ❌ | ⚠️ (HTML لینک) | ✅ (React components) |
| **تصویر** | ✅ (لینک) | ✅ | ❌ | ❌ | ✅ (Embedded) | ✅ (Embedded + گالری) |
| **PDF پیوست** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (پیش‌نمایش) |
| **ارسال گروهی** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ (گروه/کانال) |
| **ورودی دوطرفه** | ✅ | ✅ | ✅ (DTMF) | ✅ (keyword) | ✅ (reply) | ✅ (بلادرنگ) |
| **فوریت** | بالا | بالا | لحظه‌ای | متوسط | پایین | لحظه‌ای (داخلی) |
| **هزینه** | کم | کم | زیاد | کم | کم | رایگان (داخلی) |
| **مناسب برای** | فروش، پشتیبانی | فروش، پشتیبانی | تماس ضروری | Notification | اسناد رسمی | گفتگوی داخلی، اعلان اپراتور |

### قوانین تغییر Omnichannel

1. **Adapter جدید:** فقط در `SERVICE_CONTRACTS.md` ثبت contract شود → پیاده‌سازی → smoke test → deploy.
2. **تغییر در Response Model:** همه adapterهایی که مصرف‌کننده هستند باید re-check شوند.
3. **تغییر در backend business logic:** adapter downstreamها باید smoke test شوند (آیا intent جدید به درستی render می‌شود؟).
4. **تغییر در env docs:** DB source gate عبور کند.
 5. **Adapter ممنوع از hardcoded API base:** همه URLها از env var خوانده شوند.

---

## 8. Notification Orchestration & Acknowledgment Flow

> قرارداد رسمی تحویل اعلان (Notification) در معماری Omnichannel.
>
> این section **جایگزین هیچ منطق کسب‌وکاری نیست** — فقط تحویل اعلان از سمت
> adapter به کاربر را تعریف می‌کند. اینکه *چه موقع* اعلان ارسال شود، در
> business logic (`backend/`) تعیین می‌شود.

### 8.1 OutboundNotification Schema

هر اعلان خروجی (صرف‌نظر از کانال) از این ساختار واحد پیروی می‌کند:

| فیلد | نوع | الزامی | توضیح |
|------|-----|--------|-------|
| `id` | string (uuid) | ✅ | شناسه یکتای اعلان (برای idempotency و tracking) |
| `channel` | string | ✅ | کانال مقصد: `whatsapp`, `bale`, `sms`, `email`, `voice`, `messenger` |
| `recipient_id` | string | ✅ | شناسه گیرنده در آن کانال (شماره موبایل / chat_id / email) |
| `priority` | string | ✅ | `low`, `normal`, `high`, `critical` (تأثیر روی retry و escalation) |
| `type` | string | ✅ | نوع اعلان: `notification`, `alert`, `promotional`, `transactional`, `otp`, `internal_task`, `operator_alert` |
| `content` | object | ✅ | محتوای اعلان — ساختار وابسته به کانال |
| `content.text` | string | ✅ | متن اصلی اعلان |
| `content.blocks` | array | خیر | بلوک‌های ساختاریافته (منو، محصول، و...) — مطابق Response Model |
| `content.attachments` | array | خیر | پیوست‌ها (Email: PDF فاکتور؛ Messenger: تصویر/سند) |
| `ttl_seconds` | number | خیر | زمان اعتبار اعلان (پیش‌فرض: ۳۶۰۰ = ۱ ساعت)؛ پس از آن منقضی تلقی می‌شود |
| `correlation_id` | string | خیر | شناسه همبستگی (برای رهگیری یک رویداد در چند کانال) |
| `metadata` | object | خیر | فراداده (منبع رویداد، business intent، و...) |
| `created_at` | string (ISO) | ✅ | زمان ایجاد اعلان |
| `expires_at` | string (ISO) | خیر | زمان انقضا (محاسبه از `created_at` + `ttl_seconds`) |

#### مثال (JSON)

```json
{
  "id": "notif_uuid_001",
  "channel": "whatsapp",
  "recipient_id": "98912xxxxxxx",
  "priority": "high",
  "type": "transactional",
  "content": {
    "text": "سفارش شما با موفقیت ثبت شد.",
    "blocks": [
      { "type": "product_card", "title": "چای شکسته زرین", "price": "۲۸۰,۰۰۰ ریال" }
    ]
  },
  "ttl_seconds": 1800,
  "correlation_id": "order_uuid_456",
  "metadata": { "order_status": "registered", "source": "backend" },
  "created_at": "2026-07-21T10:00:00Z"
}
```

### 8.2 Acknowledgment Protocol

پس از ارسال اعلان به adapter کانال، adapter موظف است وضعیت تحویل را
به orchestration layer گزارش دهد. این پروتکل در سه سطح تعریف می‌شود:

#### سطح ۱ — Delivery Status (تحویل فنی)

| وضعیت | کد | توضیح | اقدام |
|-------|-----|-------|-------|
| **sent** | `SENT` | اعلان با موفقیت به سرویس کانال ارسال شد | منتظر Ack کاربر |
| **failed** | `FAILED` | خطای فنی در ارسال (API کانال در دسترس نیست / timeout) | Retry طبق policy |
| **rejected** | `REJECTED` | سرویس کانال اعلان را رد کرد (شماره نامعتبر / مسدود / spam) | عدم retry — Flag برای اپراتور |
| **queued** | `QUEUED` | اعلان در صف انتظار (rate-limit / زمان غیرمجاز) | ارسال بعدی طبق schedule |

#### سطح ۲ — User Acknowledgment (تأیید کاربر)

| وضعیت | کد | توضیح | مهلت |
|-------|-----|-------|------|
| **seen** | `SEEN` | کاربر اعلان را مشاهده کرد (رسید خواندن) | — |
| **read** | `READ` | کاربر محتوای اعلان را باز کرد | — |
| **replied** | `REPLIED` | کاربر به اعلان پاسخ داد (پیام ورودی جدید) | — |
| **acknowledged** | `ACKNOWLEDGED` | کاربر صریحاً تأیید کرد (دکمه «تأیید» / پاسخ مثبت) | — |
| **pending** | `PENDING` | اعلان ارسال شده اما کاربر هنوز اقدامی نکرده | TTL اعلان |
| **expired** | `EXPIRED` | کاربر در مهلت مقرر اقدامی نکرد | Escalation |
| **dismissed** | `DISMISSED` | کاربر اعلان را رد/نادیده گرفت | عدم escalation |

#### سطح ۳ — Channel-Fallback (تغییر کانال)

| وضعیت | کد | توضیح |
|-------|-----|-------|
| **fallback_pending** | `FB_PENDING` | کانال اولیه پاسخ نداد — fallback به کانال بعدی در صف |
| **fallback_sent** | `FB_SENT` | اعلان از طریق کانال جایگزین ارسال شد |
| **fallback_acknowledged** | `FB_ACKED` | کاربر از طریق کانال جایگزین تأیید کرد |
| **fallback_exhausted** | `FB_EXHAUSTED` | همه کانال‌های fallback مصرف شد — Escalation به اپراتور |

### 8.3 Escalation Logic

هنگامی که اعلان در مهلت مقرر تأیید نشود، escalation بر اساس سطح priority
و نوع اعلان اجرا می‌شود.

#### پارامترهای Escalation

| priority | مهلت Ack | تعداد Retry | فاصله Retry | کانال Fallback | Escalation نهایی |
|----------|----------|-------------|-------------|----------------|-------------------|
| `low` | ۶۰ دقیقه | ۱ بار | ۳۰ دقیقه | ندارد (فقط همان کانال) | لاگ + نادیده‌گیری |
| `normal` | ۳۰ دقیقه | ۲ بار | ۱۰ دقیقه | SMS (در صورت موجود بودن) | لاگ + تذکر در dashboard |
| `high` | ۱۵ دقیقه | ۳ بار | ۵ دقیقه | SMS → Voice | تیکت پشتیبانی (priority: high) |
| `critical` | ۵ دقیقه | ۵ بار | ۱ دقیقه | SMS → Voice → Email | تماس تلفنی اپراتور + تیکت فوری |

#### الگوریتم Escalation

```
1. ارسال اعلان در کانال اولیه
2. منتظر Ack کاربر تا مهلت priority
3. اگر Ack نشد:
   a. Retry در همان کانال (تعداد = priority.retry_count)
   b. بین retryها: فاصله = priority.retry_interval
   c. اگر باز هم Ack نشد:
      i.   اگر fallback channel وجود دارد → ارسال در کانال بعدی (set status = FB_SENT)
      ii.  اگر fallback channel وجود ندارد → FB_EXHAUSTED
      iii. اگر همه fallbackها مصرف شد → escalation نهایی
4. escalation نهایی:
   - low:    فقط لاگ در audit
   - normal: نمایش در dashboard اپراتور
   - high:   ایجاد تیکت خودکار در support-tickets
   - critical: تماس با اپراتور (از طریق Voice adapter) + تیکت فوری
5. ثبت تمام مراحل در audit log با eventهای:
   - notification_sent
   - notification_retried
   - notification_acknowledged
   - notification_expired
   - fallback_triggered
   - escalation_created
```

### 8.4 Queue & Retry Policy

#### صف ارسال (Outbound Queue)

- همه اعلان‌ها قبل از ارسال در یک صف داخلی قرار می‌گیرند.
- صف از FIFO با priority queue پشتیبانی می‌کند: اعلان‌های `critical` و `high`  priority بالاتر دارند.
- **Rate limiting:** هر adapter حداکثر ۳۰ پیام در دقیقه به یک گیرنده مجاز است (قابل تنظیم با env var).

#### Retry Policy

| پارامتر | مقدار پیش‌فرض | قابل تنظیم |
|---------|---------------|-----------|
| حداکثر تعداد retry | ۳ (برای `normal`) | ✅ از طریق env var `MAX_RETRY_COUNT` |
| فاصله بین retryها | exponential backoff: ۱د, ۵د, ۱۵د | ✅ از طریق env var `RETRY_INTERVAL_BASE` |
| Retry فقط برای `FAILED` | بله — `REJECTED` هرگز retry نمی‌شود | ❌ ثابت |
| Idempotency | هر `id` فقط یک بار پردازش می‌شود (dedupe تا ۲۴ ساعت) | ✅ از طریق `idempotency_window_seconds` |

#### Exponential Backoff

```
Retry 1: wait = RETRY_INTERVAL_BASE × 1
Retry 2: wait = RETRY_INTERVAL_BASE × 5
Retry 3: wait = RETRY_INTERVAL_BASE × 15
Retry N: wait = min(RETRY_INTERVAL_BASE × 5^(N-1), MAX_RETRY_WAIT)
```

مقادیر پیش‌فرض: `RETRY_INTERVAL_BASE = 60` (ثانیه), `MAX_RETRY_WAIT = 3600` (۱ ساعت).

#### Dead Letter Queue (DLQ)

اعلان‌هایی که پس از مصرف تمام retry و fallbackها هنوز تأیید نشده‌اند،
به DLQ منتقل می‌شوند. DLQ یک جدول در Supabase است:

```sql
-- schema: public.notification_dlq
-- id, original_payload (jsonb), error_history (jsonb[]),
-- final_status, escalated_at, resolved_at, resolved_by
```

اپراتور می‌تواند از طریق Admin Panel:
- DLQ را مرور کند
- اعلان را مجدداً ارسال کند (manual retry)
- اعلان را ببندد (resolve)
- escalation دستی ایجاد کند

### 8.5 ماتریس تحویل بین‌کانالی

| سناریو | کانال اول | Fallback 1 | Fallback 2 | اقدام نهایی |
|--------|-----------|------------|------------|-------------|
| تأیید سفارش | WhatsApp | SMS | — | تیکت پشتیبانی بعد از FB |
| هشدار پرداخت | WhatsApp | SMS | Voice | تماس اپراتور |
| اطلاع‌رسانی عمومی | WhatsApp | Bale | — | فقط لاگ |
| کد تأیید (OTP) | SMS | WhatsApp | — | لاگ + اخطار امنیتی |
| فاکتور رسمی | Email | — | — | تذکر در dashboard |
| پیام بحرانی (فیلترینگ) | Bale | SMS | Voice | تماس اپراتور + تیکت فوری |
| اعلان اپراتور (وظیفه جدید) | Messenger | — | — | اعلان در داشبورد اپراتور |
| نقل قول از مشتری به اپراتور | Messenger | SMS | — | اعلان + تیکت اگر بی‌پاسخ ماند |
| یادآوری وظیفه اپراتور | Messenger | Email | — | escalation به مدیر بعد از ۲ بار |

### 8.6 قوانین تغییر Notification

1. **تغییر در OutboundNotification Schema:** همه adapterهای مصرف‌کننده باید re-check شوند.
2. **تغییر در Escalation Parameters:** فقط در SERVICE_CONTRACTS.md ثبت شود → بازبینی dashboard.
3. **تغییر در Retry Policy:** env varهای مربوطه در هر adapter به‌روز شوند.
4. **Adapter جدید:** باید Acknowledgment Protocol (سطح ۱ و ۲) را پیاده‌سازی کند.
5. **مقادیر پیش‌فرض Retry:** برای همه کانال‌ها یکسان است — در صورت نیاز کانال خاص، override در env var آن adapter.
