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
