# Project Map

> نقشه رسمی و قابل استناد منابع (source-of-truth) مونورپو آذرمهر صنعت.
> این فایل توسط `docs/PROJECT_TASK_EVIDENCE_AI_MVP_PLAN.md` (بخش ۲، خط ۲۷) به‌عنوان سند الزامیِ
> پیش از هر پیاده‌سازی معرفی شده است. هر ادعای مربوط به status فایل‌ها از کد، `package.json`،
> `vercel.json`، importها و route mounting تأیید شده است — بدون حدس.

> قوانین سخت‌گیرانه: هیچ منطق application در این تسک تغییر نیافته است. فقط این فایل ایجاد شد.
> هیچ secret/token/credential درج نشده است. URL ممنوعه `azarmehr-backend-main.vercel.app` استفاده نشده است.

---

## Purpose

این سند مرجع واحد برای تعیین موارد زیر است:
- **source-of-truth** هر app/service (کدام فایل واقعی منبع است).
- **production entry point** و نحوهٔ deploy.
- **generated/build artifacts** (که نباید دستی ویرایش شوند).
- **legacy / deprecated / orphan / unknown** فایل‌ها.
- ارتباط frontendها با backend و جداول Supabase.
- محل دقیق ماژول **کنترل پروژه** و **ارزیابی عملکرد**.
- وضعیت endpointها و قراردادهای مهم (برای جلوگیری از رگرسیون).

هم‌راستا با `docs/DEVELOPMENT_RULES.md` (بخش ۱: Supabase فقط منبع داده؛ بخش ۲: پیش‌بینی رگرسیون بین‌سرویسی).

---

## Repository Applications

| App/Service | Purpose | Status | Source of Truth | Production Entry | Build Output | Deployment Target | API Dependency |
|---|---|---|---|---|---|---|---|
| `backend/` | API مرکزی (CRM، کاربران، پروژه، وظیفه، جلسه، گزارش، WhatsApp) | PRODUCTION | `backend/handlers/*.js` + `backend/api/index.js` + `backend/server.js` + `_lib.js`/`_audit.js` | Vercel → `backend/api/index.js`؛ محلی/Render → `backend/server.js` | — (Node) | Vercel serverless (`api/index.js`)؛ Render (`server.js`) | Supabase (service-role) |
| `admin-panel/` | پنل مدیریت داخلی (SPA تک‌فایله) | PRODUCTION | `admin-panel/index.html` (خودِ فایل) | `admin-panel/index.html` | — (build ندارد) | Vercel static | `backend` (`/api`) |
| `messenger-app/` | پیام‌رسان داخلی (SPA) | PRODUCTION | `messenger-app/components/index.jsx` (طبق DEVELOPMENT_RULES §۳) | `messenger-app/index.html` ← `bundle.min.js` | `bundle.min.js` (GENERATED) | Vercel static (`outputDirectory:"."`) | `backend` (`/api`) |
| `wholesale-portal/` | پورتال مشتریان عمده‌فروش (static تک‌فایله) | PRODUCTION (static) | `wholesale-portal/index.html` | `wholesale-portal/index.html` | — | Vercel static (`outputDirectory:"."`) | `backend` (hardcoded) + Supabase anon |
| `whatsapp-broadcast-api/` | ربات WhatsApp (UltraMsg → Vercel → Supabase) | PRODUCTION (webhook) | `whatsapp-broadcast-api/api/webhook.js` | Vercel `api/webhook.js` | — | Vercel serverless | UltraMsg، Supabase، admin-panel (ghost) |

---

## Production URLs

فقط URLهایی که در کد/پیکربندی ریپو تأیید شده‌اند آورده شده‌اند. URL ممنوعه درج نشده است.

- **Backend:** `https://azarmehr-backend.vercel.app` — تأیید شده در `wholesale-portal/index.html:152` (مقدار `API_BASE`) و `messenger-app/package.json` (`VITE_API_BASE_URL`).
- **Retail (سایت شرکت، طبق AGENTS.md):** `https://scorpiongroup.ir` — کانال فروش خرده؛ app در این ریپو نیست.
- **Wholesale Portal:** UNKNOWN — هیچ URL استقرارِ تأییدشده‌ای در ریپو نیست؛ `index.html` منبع static است.
- **Messenger:** UNKNOWN — هیچ URL استقرارِ تأییدشده‌ای در ریپو نیست.

> ⚠️ هشدار: `azarmehr-backend-main.vercel.app` طبق AGENTS.md و MVP-plan ممنوع است؛ در این سند درج نشده است.
> ⚠️ هیچ secret/توکن/credential در این سند وجود ندارد.

---

## Source-of-Truth Rules

### backend/
- **Source:** `backend/handlers/*.js` (هر فایل `module.exports = (req,res)=>{}`)، `backend/api/index.js` (ورودی Vercel)، `backend/server.js` (ورودی Render)، `backend/handlers/_lib.js` (auth/RBAC)، `backend/handlers/_audit.js` (audit).
- **Generated:** ندارد.
- **Legacy:** ندارد (همه handlerها فعالند).
- **تغییر نده:** فایل‌های generated وجود ندارند؛ در صورت افزودن، در `.gitignore` بیفتند.

### admin-panel/
- **Source:** `admin-panel/index.html` (تک‌فایله؛ شامل Babel/React درون‌خطی که در مرورگر کامپایل می‌شود).
- **Generated:** ندارد (build ندارد).
- **Legacy:** ندارد.
- **تغییر نده:** خودِ `index.html` منبع است؛ پس از هر تغییر فقط refresh مرورگر لازم است.

### messenger-app/
- **Source:** `messenger-app/components/index.jsx` (SoT قطعی طبق DEVELOPMENT_RULES §۳).
- **Entry/Build:** `messenger-app/app.jsx` (ورودی browserify) → `npm run build:min` (browserify+babelify+envify) → `messenger-app/bundle.min.js`؛ `index.html` آن را لود می‌کند.
- **Generated (دست نزن):** `bundle.min.js`، و همچنین `bundle.js` / `bundle.dev.js` / `bundle.tmp.js` (در ریشه، روی Vercel عمومی سرو می‌شوند). فقط با `npm run build:min` بازتولید شوند.
- **Legacy / Dead code:** `messenger-app/modules/*` (Admin.jsx, Chat.jsx, CRM.jsx, …) — کد مُرده، در زنجیره build استفاده نمی‌شوند.
  - **Unknown (ویرایش نشوند):** `messenger-app/_verify_permissions.js`، `add_rls_policy.js`، `_server.js` — ابزاری/utility؛ اکنون با `.vercelignore` از deploy عمومی Vercel خارج شدند (در ریشهٔ local باقی‌اند).

### wholesale-portal/
- **Source:** `wholesale-portal/index.html`.
- **Generated:** ندارد.
- **Legacy / Deprecated:** `dashboard.html` (LEGACY duplicate)، `wholesale-dashboard.jsx` (ORPHAN، لود نمی‌شود)، فایل‌های `*.bak` / `*.backup-*` / `*.bak-deeplink` / `*.backup-vanilla` / `dashboard.html.bak` (بکاپ).
- **Unknown / publicly-served debug:** `test.html`، `simple-test.html`، `test_syntax.js`، `debug_check.js`، `debug_check2.js`، `check_local.js`، `check_end.js`، `check_deploy.js` — چون deploy static با `outputDirectory:"."` است، همگی عمومی سرو می‌شوند (security follow-up).

### whatsapp-broadcast-api/
- **Source:** `whatsapp-broadcast-api/api/webhook.js` (تنها endpoint زنده).
- **Generated:** ندارد.
  - **Legacy:** `vercel.json` مسیرهای admin تبلیغ می‌کرد که پیاده‌سازی نداشتند (ghost routes) — در P1.1.2-A این مسیرهای ghost حذف شدند و فقط `/api/webhook` باقی ماند.

---

## Admin Panel

- **architecture:** تک‌فایله (`index.html`)؛ React + Babel درون‌خطی؛ بدون bundler.
- **entry point:** `admin-panel/index.html`.
- **API resolution:** تابع `resolveApiBase()` (خط ۱۰۶–۱۲۸) به ترتیب بررسی می‌کند:
  `window.AZARMEHR_API_BASE` → پارامتر `?apiBase=` → `localStorage.AZARMEHR_API_BASE` → فال‌بک `/api`.
  تابع `api(method, path, body)` (خط ۱۶۷–۱۹۷) آدرس را می‌سازد: `${BASE}/${path}` و پیشوند `/api/` را حذف می‌کند.
- **modules:** `AccessModule` (مدیریت کاربران)، `ReportsModule` (خط ۴۲۵۰ — ارزیابی عملکرد)،
  گردش کار سفارش→پروژه `convertToProject` (خط ۱۷۶۴)، پنل پروژه‌ها/وظایف.
- **known constraints:**
  - تغییر در `index.html` مستقیماً اعمال می‌شود؛ build ندارد.
  - SoT همان `index.html` است.
  - ویرایش رمز کاربر در حالت edit اکنون از مسیر مجاز `POST users/:id/reset-password` عبور می‌کند (هم‌راستا با hardening اخیر در `backend/handlers/users.js`).
  - فیلد `active` در قرارداد backend موجود نیست (toggle در UI صرفاً نمایشی است — جستار قرارداد).

---

## Messenger App

- **source/build pipeline:** `components/index.jsx` (SoT) ← ورودی `app.jsx` (browserify) →
  `npm run build:min` (browserify + babelify + envify) → `bundle.min.js` → `index.html` لود می‌کند.
- **generated artifacts:** `bundle.min.js` (GENERATED — دست نزن؛ فقط با build بازتولید شود)؛
  همچنین `bundle.js` / `bundle.dev.js` / `bundle.tmp.js` در ریشه — خروجی‌های build؛ اکنون با `.vercelignore` از deploy عمومی خارج شدند (فقط `bundle.min.js` در production لود می‌شود).
- **public output directory:** `vercel.json` → `outputDirectory:"."` یعنی **کل پوشه** استاتیک و عمومی سرو می‌شود.
- **archived debug pages:** `test-login.html` و `inject.html` (صفحات auth-bypass) به
  `messenger-app/_security_archive/*.bak` منتقل و با `.vercelignore` از deploy خارج شدند
  (دسترسی عمومی بسته شد — جستار Security Follow-ups).
- **security follow-ups:** `_verify_permissions.js`، `add_rls_policy.js`، `_server.js` و فایل‌های bundle
  غیرِمین — اکنون با `.vercelignore` از deploy عمومی Vercel خارج شدند (تسک cleanup؛ همچنان در ریشهٔ local باقی‌اند).

---

## Backend

  - **local entry:** `backend/server.js` (Express روی Render؛ `app.listen`). ۴۶ handler را mount می‌کند.
- **Vercel entry:** `backend/api/index.js` (تابع serverless واحد که همه handlerها را داخلی route می‌کند). ۴۶ handler را mount می‌کند.
- **shared handlers:** `backend/handlers/*.js` — هر فایل `module.exports = async (req,res)=>{}`.
- **auth/RBAC:** `backend/handlers/_lib.js` → `requireAuth`، `requireRole(allowedRoles)`،
  `requireAdmin` (مجاز: `super_admin`,`admin`)، `requireSuperAdmin` (فقط `super_admin`).
  JWT با `jsonwebtoken` و متغیر `JWT_SECRET`.
- **route mounting:**
  - `server.js`: تابع `mount(basePath, handler)` (خط ۴۸–۵۱) → `app.all(base)` + `app.all(base/*)`.
  - `api/index.js`: آرایه `routes` (خط ۳۳–۸۰) + `app.all(route)` + `app.all(route/*)`.
- **route parity (حل شد — تسک alignment):** قبلاً `api/index.js` (Vercel) ۶ مسیر داشت که در `server.js` (Render)
  mount نشده بودند؛ اکنون هر ۶ تا (`/api/portal-login-retail`، `/api/roles`، `/api/role-permissions`،
  `/api/groups`، `/api/crm-draft-orders`، `/api/whatsapp-rules`) در هر دو entrypoint mount شده‌اند → parity برقرار است.
  تفاوت جزئی باقی‌مانده: catch-all در `api/index.js` (`app.all('*')`) لیست routeها را برمی‌گرداند؛ در `server.js` فقط ریشه (`app.all('/')`).

---

## Wholesale Portal

- **entry/source:** `wholesale-portal/index.html` (static تک‌فایله؛ `package.json` ندارد؛ build ندارد).
- **API configuration:** `API_BASE` اکنون از resolver استفاده می‌کند (تسک cleanup): اولویت
  `?apiBase=` → `window.AZARMEHR_API_BASE` → `localStorage.AZARMEHR_API_BASE` → فال‌بک همان
  `"https://azarmehr-backend.vercel.app/api"` (`index.html:152`). هیچ URL جدید hardcode نشد؛ رفتار
  production تغییر نکرد. `WHATSAPP_API_BASE` نیز همین الگو را دارد.
  همچنان کلاینت مستقیم Supabase با anon key در مرورگر (`SUPABASE_URL`/`SB` خط ۱۳۷۰/۲۴۸۳؛ نوشتن در
  `notifications`/`customers` با anon key) — security follow-up (افشای anon key + نوشتن سمت کلاینت).
- **Supabase dependency:** دسترسی مستقیم مرورگر به Supabase (anon) برای notifications و sync مشتری
  (خط ۱۳۷۰–۱۴۰۸ و ۲۴۸۳–۲۵۰۸). پیشنهاد follow-up: انتقال نوشتن به backend proxy
  (`/api/notifications`) + بازبینی RLS + چرخش anon key در صورت افشا.
- **missing backend route:** فرانت‌اند `${API_BASE}/public-warranty-request` فراخوانی می‌کند اما هیچ
  handlerی در backend برای آن وجود ندارد (grep یافت نشد) — follow-up (احتمالاً ۴۰۴).
- **forbidden URL note:** `azarmehr-backend-main.vercel.app` فقط در فایل legacy `index.html.bak-deeplink`
  (خط ۴۷) دیده شد، نه در `index.html` تولید؛ طبق قوانین دست‌نخورده باقی ماند.
- **production status:** PRODUCTION (static deploy؛ `index.html` ورودی فعال).
  نکته: به‌دلیل `outputDirectory:"."`، فایل‌های debug/test/backup نیز عمومی سرو می‌شوند.

---

## WhatsApp Broadcast API

- **implemented endpoints:** `POST/GET /api/webhook` (UltraMsg webhook؛ `whatsapp-broadcast-api/api/webhook.js`
  تنها endpoint زنده است).
- **advertised but missing:** `vercel.json` مسیرهای admin (مثل UI مدیریت WhatsApp پنل ادمین) را تبلیغ
  می‌کند که پیاده‌سازی ندارند → UI مدیریت WhatsApp در admin-panel **۴۰۴/BROKEN** است (ghost routes).
- **webhook security status:** در D0 تأیید شد که هیچ تأیید امضای ورودی در `webhook.js`/`_lib.js` وجود ندارد (ABSENT). در P0 (۱۴۰۵/۰۴/۲۳) یک **shared-secret gate** افزوده شد: هدر `X-Webhook-Secret` با `ULTRAMSG_WEBHOOK_SECRET` (مقایسهٔ constant-time در `_webhook-security.js`) بررسی می‌شود؛ POST پیش از پردازش احراز می‌شود و fail-closed است. جزئیات در `docs/OMNICHANNEL_AI_AGENT_BLUEPRINT.md` §۱۶.
  - **ghost routes:** ۱۲ مسیر تبلیغ‌شده در `vercel.json` فاقد فایل مقصدند (جستار Contract Gaps / Security Follow-ups). در P1.1.2-A حذف شدند (فقط مسیر `/api/webhook` در vercel.json باقی ماند).

---

## Project Control Module

ماژول مدیریت پروژه، وظایف، مستندات و ارزیابی عملکرد (نام فارسی از MVP-plan، خط ۷۰).

### frontend source
- **admin-panel (مدیریت — SoT frontend اصلی):** تابع `convertToProject` (خط ۱۷۶۴) سفارش را به پروژه
  تبدیل کرده و ۸ وظیفهٔ B2B می‌سازد؛ مستقیماً `POST /api/projects` (خط ۱۷۶۷، با `API_BASE`) و
  `POST /api/project-tasks` (خط ۱۷۸۱) فراخوانی می‌کند. پنل پروژه‌ها/وظایف نیز در همین فایل است.
  - **رفع باگ (تسک hardening/completion):** خط ۱۷۸۱ ابتدا متغیر خارج‌از‌دسترس `BASE` را
    استفاده می‌کرد (`BASE` فقط در تابع `api()` محلی است → `ReferenceError` هنگام ساخت وظایف)؛
    به `API_BASE` اصلاح شد تا با پست پروژه (خط ۱۷۶۷) هم‌راستا باشد. فیلدهای ارسالی
    (`manager_id`, `assigned_to`, `priority`, `project_id`, `title`, `description`) با schema
    بک‌اند تطابق دارند؛ `WORKFLOW_USERS` مقدار UUID معتبر دارد (تطابق با FK از نوع uuid).
- **messenger-app (نمای کارمندی):** تب‌های `projects`/`tasks` (components/index.jsx خط ۱۴۹۱، ۱۷۷۰)
  از **state محلی** (مقداردهی اولیه با `INIT_PROJECTS` در app.jsx خط ۲۶۷) و آرایهٔ hardcoded `USERS`
  (app.jsx خط ۲۵–۳۸، id صحیح عددی نه UUID) رندر می‌شوند → به‌نظر می‌رسد نمای **محلی/دمو** باشد،
  نه متصل به فروشگاه زندهٔ backend. وضعیت: **UNKNOWN / EXPERIMENTAL integration** (تأیید لازم).

### backend source
| Handler | Table | نکته |
|---|---|---|
| `backend/handlers/projects.js` | `projects` | GET/POST/PUT/DELETE؛ RBAC: GET `requireAuth`، POST/PUT `requireAdmin`، DELETE `requireSuperAdmin`؛ audit log |
| `backend/handlers/project-tasks.js` | `project_tasks` | چرخهٔ وضعیت کامل `TRANSITIONS`؛ زیرمسیرها: `seen/acknowledge/start/submit/review/progress/blockers/cancel/archive/clarify`؛ جداول فرزند: `task_status_history`, `task_attachments`, `task_progress_updates`, `task_blockers` |
| `backend/handlers/project-members.js` | `project_members` | GET `requireAuth`، POST `requireAdmin`، DELETE `requireSuperAdmin` |
| `backend/handlers/meetings.js` | `meetings` | GET `requireAuth`، POST/PUT `requireAdmin`؛ زیرمسیر `action-items` |
| `backend/handlers/meeting-action-items.js` | `meeting_action_items` | `convert-to-task` → ساخت `project_tasks`؛ PUT `requireAdmin` |

### database source
- `supabase/create-projects-tasks.sql` → `projects`, `project_members`, `project_tasks`, `task_status_history`, `task_attachments`
- `supabase/create-meetings-ai-audit.sql` → `meetings`, `meeting_action_items`, `ai_drafts`, `audit_logs`
- `supabase/create-task-progress-blockers.sql` → `task_progress_updates`, `task_blockers`
- `supabase/fix-project-tasks-status-lifecycle.sql` → افزودن ستون `completed_at` (idempotent) + اصلاح چرخهٔ وضعیت
- `supabase/rbac-tables.sql` / `run-all-in-dashboard.sql` → `user_roles`, `role_permissions`
- `supabase/groups-tables.sql` → `groups`, `group_members`
- `supabase/crm-production-baseline.sql` → **CRM Schema Source of Truth**: `crm_customers`, `crm_draft_orders`, `crm_orders`, `crm_order_items`<br>
  ⚠️ **این فایل یک snapshot دقیق از schema production است، نه migration اجرایی.**<br>
  ⚠️ **`supabase/create-crm-tables.sql` (draft قدیمی) با production ناسازگار است — UUID‑ها باید bigint باشند و auth_user_id وجود نداشت. از آن استفاده نکن.**

### lifecycle / status model
- `project-tasks.js` خط ۶–۲۷ (SSOT عددی):
  - `TERMINAL_STATUSES = ['APPROVED','REJECTED','CANCELLED','ARCHIVED']`
  - `SUCCESSFULLY_COMPLETED_STATUSES = ['APPROVED']`
  - `FINAL_WITH_COMPLETED_AT = ['APPROVED','REJECTED','ARCHIVED']`
  - `TRANSITIONS` map کامل (ASSIGNED→…→ARCHIVED)
  - وضعیت اولیه هنگام create: `ASSIGNED`
  - `ARCHIVED` وضعیت پایانی (terminal) است.

### RBAC / RLS / audit
- **RBAC:** GET `requireAuth`؛ create/update `requireAdmin`؛ delete `requireSuperAdmin`؛
  cancel/archive/review `requireAdmin`؛ تغییر وضعیت `requireAuth` (برخی admin).
- **RLS:** `supabase/rls-policies.sql` → RLS فعال روی `projects, project_members, project_tasks,
  task_status_history, task_attachments, task_progress_updates, task_blockers, meetings,
  meeting_action_items, ai_drafts, audit_logs`. سیاست‌ها از `auth.jwt() ->> 'system_role'` استفاده می‌کنند.
  - **GAP (۳ جدول):** `task_progress_updates`، `task_blockers` و `meeting_action_items` RLS فعال
    دارند اما **هیچ سیاستی ندارند** → deny-by-default برای کلاینت Supabase (backend چون service-role
    است unaffected؛ دسترسی مستقیم مرورگر به این جداول مسدود است). شدت: LOW (fail-closed).
    فایل پیشنهادی آماده: `supabase/rls-policies-project-control-addendum.sql` (اجرا نشده)؛
    جزئیات در `docs/DB_MIGRATION_READINESS.md`.
- **Audit:** `backend/handlers/_audit.js` → `writeAuditLog` رکورد در `audit_logs` برای
  create/update/delete/status_change/approve ثبت می‌کند و هرگز throw نمی‌کند.

### production readiness
**PRODUCTION.** بک‌اند کامل با RBAC + audit + چرخهٔ وضعیت + RLS پیاده‌سازی شده؛ admin-panel
فرانت‌اند مدیریت است. نتایج تسک hardening/completion (۱۴۰۵/۰۴/۲۳):
- **route parity:** هر دو entrypoint (`server.js` و `api/index.js`) ۶ مسیر کنترل پروژه
  (projects, project-tasks, project-members, meetings, meeting-action-items, reports) را mount
  می‌کنند → هم‌راستا (در بخش Backend ثبت شد).
- **TERMINAL_STATUSES:** در `project-tasks.js` (خط ۶) و `reports.js` (خط ۲۷) **دقیقاً یکسان**
  است (`['APPROVED','REJECTED','CANCELLED','ARCHIVED']`) → تکرار (DRY)، نه mismatch. در
  admin-panel هیچ ثابت status برای وظایف وجود ندارد (مقادیر از بک‌اند می‌آید) → عدم تطابق
  frontend/backend. CHECK constraint در `fix-project-tasks-status-lifecycle.sql` نیز همین ۱۳
  وضعیت را تأیید می‌کند.
- **convertToProject باگ (رفع شد):** خط ۱۷۸۱ از `BASE` خارج‌از‌دسترس استفاده می‌کرد
  (`ReferenceError`)؛ به `API_BASE` اصلاح شد (۱ خط تغییر در admin-panel/index.html).
- **messenger projects/tasks:** تأیید شد locally/demo است (`INIT_PROJECTS` در app.jsx خط ۲۶۷،
  `loadLS` خط ۶۹۷) و هیچ فراخوانی `/api/project*` ندارد → وابستگی تولیدی نیست؛ دست‌نخورده باقی ماند.
- ستون `completed_at` فقط با اجرای `fix-project-tasks-status-lifecycle.sql` اضافه می‌شود (اطمینان از اجرا).
- RLS برای ۳ جدول (`task_progress_updates`/`task_blockers`/`meeting_action_items`) سیاست ندارد
  (تأیید شد در rls-policies.sql خط ۷–۸، ۱۰؛ پیشنهاد اصلاح در addendum).
- `TERMINAL_STATUSES` تکرار شده (یکسان؛ فقط DRY — تغییری لازم نیست مگر بازآرایی اختیاری).

### duplicated / legacy / unknown
- **Duplicated:** `TERMINAL_STATUSES` در `project-tasks.js` و `reports.js` (یکی شود).
- **Legacy:** ندارد.
- **Unknown:** ادغام تب projects در messenger-app با backend (دمو/محلی).

---

## Performance Evaluation Module

### frontend source
- **admin-panel:** منوی «گزارشات» (خط ۶۷۳۲) → `ReportsModule` (index.html خط ۴۲۵۰) را رندر می‌کند.
  ⚠️ **تصحیح:** `ReportsModule` یک ماژول **گزارش‌گیری فروش CRM** است (فراخوانی `crm_orders`,
  `crm_customers`, `products`, `crm_order_items`) و **هیچ‌کدام** از endpointهای `/api/reports/*`
  را صدا نمی‌زند. در نتیجه endpoint ارزیابی کارمندی `GET /api/reports/users/performance`
  **مصرف‌کنندهٔ UI در admin-panel ندارد** (orphaned / uncovered). ماژول ارزیابی عملکرد
  کارمندی در admin-panel پیاده‌سازی نشده است (فقط بک‌اند read-only موجود است).

### backend source
- **`backend/handlers/reports.js`** — ۶ endpoint فقط-GET:
  - `GET /api/reports/projects/summary`
  - `GET /api/reports/tasks/summary`
  - `GET /api/reports/tasks/overdue`
  - `GET /api/reports/tasks/blocked`
  - `GET /api/reports/users/performance`  ← فقط admin
  - `GET /api/reports/meetings/summary`
- **`backend/handlers/performance-reports.js`** — محاسبه و ذخیره امتیاز عملکرد (فقط admin):
  - `POST /api/reports/performance/calculate`  ← فقط admin (`requireAdmin`)
    - ورودی: `userId`, `startDate`, `endDate`
    - می‌خواند: `project_tasks` (فیلتر `assigned_to`, بازه `created_at`)، `task_status_history` (ستون واقعی: `project_task_id`, `status`)
    - می‌نویسد: `performance_scores` (upsert روی `user_id, start_date, end_date`)
    - وضعیت‌های تکمیل: `APPROVED`, `ARCHIVED`
  - 📌 schema `performance_scores`: `user_id` عمداً FK مستقیم به `users` **ندارد** (در این پروژه `users` یک view است و FK به آن fail می‌دهد؛ اعتبار کاربر در لایهٔ application/auth چک می‌شود). کلید upsert: (`user_id`, `start_date`, `end_date`). رفتار: وقتی تسک تکمیل‌شده‌ای نیست `avg_completion_time_hours = null`؛ وقتی `total_tasks > 0` و `completed_tasks = 0` است `quality_score = 0`.

### backend smoke test (۱۴۰۵/۰۴/۲۳ — افزودن POST /api/reports/performance/calculate)
- syntax check (`node -c` روی `server.js`, `api/index.js`, `performance-reports.js`): passed
- route mount (در `server.js` و `api/index.js`): passed
- unauthenticated POST: passed (`401` — گارد auth درست نصب شده)
- authenticated request path (توکن admin): passed (از گارد رد شد و به کوئری DB رسید؛ ۵۰۰ فقط به‌خاطر کلاینت دامی در محیط تست)
- live DB persistence: pending — منتظر اجرای `supabase/create-performance-scores.sql`
- بازتولید محلی (بدون توکن):
  ```bash
  curl -X POST "http://localhost:5000/api/reports/performance/calculate" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"00000000-0000-0000-0000-000000000000\",\"startDate\":\"2026-07-01\",\"endDate\":\"2026-07-31\"}"
  ```
  انتظار: `401` (یا `403`).

### database source
- خواندن از `projects`, `project_tasks`, `project_members`, `task_status_history`, `task_blockers`,
  `meetings`, `meeting_action_items`, `users` (Supabase JS؛ aggregation در backend چون Supabase `GROUP BY` ندارد).

### calculation model
- `users/performance`: به‌ازای هر کاربر → `assigned_count`, `completed_count` (`COMPLETED_STATUSES=['APPROVED']`),
  `in_progress_count`, `blocked_count`, `overdue_count`, `cancelled_count`,
  `completion_rate = completed/assigned`، `avg_completion_time_days`.
  ⚠️ **تصحیح محاسبه:** `avg_completion_time_days` از **`task_status_history`** محاسبه می‌شود
  (اختلاف `created_at` تسک تا اولین رکورد `changed_at` با وضعیت `APPROVED`) — **نه** از ستون
  `completed_at`. بنابراین reports.js به migration `completed_at` وابسته نیست. مقدار هنگامی
  `null` است که `task_status_history` رکورد APPROVED نداشته باشد (graceful، بدون crash؛ سقف ۲۰۰
  تسک برای محاسبه میانگین در reports.js خط ۶۳۴).
- **scope:** admin → همه پروژه‌ها؛ non-admin → فقط پروژه‌های عضو (`getMemberProjectIds`).

### role restrictions
- همه endpointها `requireAuth`؛ `/users/performance` فقط admin (`isAdmin` → وگرنه ۴۰۳).
- non-admin به پروژهٔ غیرمجاز دسترسی ندارد (scope='none' → پاسخ خالی).

### production readiness
**PARTIAL.** بک‌اندِ گزارش‌گیری read-only کامل پیاده‌سازی شده، RBAC-scoped و امن‌سازی شده
(رفع IDOR/auth-bypass در Phase 2B — ۳۹/۳۹ اسموک اوکی؛ `PHASE2B_REPORTING_API_AUTHORIZATION_FIX_REPORT.md`):
- **route parity:** `/api/reports` و زیرمسیر `/api/reports/performance/calculate` در هر دو entrypoint (`server.js`, `api/index.js`) **قبل از** mount اصلی `/api/reports` نصب شده‌اند → هم‌راستا (جلوگیری از سایه‌اندازی catch-all `/api/reports/*`).
- **completed_at:** reports.js ستون `completed_at` را **اصلاً** مرجع نمی‌دهد (محاسبه از `task_status_history`)؛
  پس اجرا/عدم‌اجرای migration روی reports.js اثری ندارد. وابستگی `completed_at` فقط در
  `project-tasks.js` (خط ۳۲۷/۴۶۳/۵۷۵ — نوشتن هنگام APPROVED/REJECTED/ARCHIVED/BLOCKED) است که
  خارج از این ماژول است و تحت migration `fix-project-tasks-status-lifecycle.sql` می‌گنجد.
- **شکاف اصلی:** endpoint ارزیابی کارمندی `GET /api/reports/users/performance` در admin-panel
  **مصرف‌کنندهٔ UI ندارد** (تب «گزارشات» صرفاً CRM sales است) → ارزیابی عملکرد کارمندی در
  فرانت‌اند پیاده‌سازی نشده است.
- این ماژول صرفاً aggregation/reporting است؛ **ماژول کامل «ارزیابی/امتیاز/KPI» کارمندی» نیست**
  (جدول اختصاصی evaluation وجود ندارد).
- برای حجم بالا به RPC نیاز دارد (reports.js خط ۲۰؛ `usersPerformance` سقف ۲۰۰ تسک برای avg).

### missing components
- **UI ارزیابی کارمندی در admin-panel وجود ندارد** (فقط بک‌اند `GET /api/reports/users/performance` موجود است؛ تب «گزارشات» CRM sales است).
- workflow/UI اختصاصی «review/score» فراتر از متریک وظیفه وجود ندارد.
- جدول اختصاصی evaluation (`performance_evaluations`/`employee_reviews`/`ratings`) وجود ندارد.
- `avg_completion_time_days` وابسته به migration `completed_at` **نیست** (از `task_status_history` است؛ فقط nullable هنگام نبود رکورد APPROVED).
- بهبود performance در حجم بالا (RPC) انجام نشده.

---

## Cross-App Dependencies

| Producer | Consumer | Endpointهای اصلی |
|---|---|---|
| `backend` (Supabase) | `admin-panel` | GET/POST/PUT `/api/projects`, `/api/project-tasks`, `/api/users`, `/api/reports/*` |
| `backend` (Supabase) | `messenger-app` | GET/POST `/api/project-tasks`, `/api/notifications`, `/api/chat` (تب projects در messenger دمو/محلی است، نه backend) |
| `backend` (Supabase) | `wholesale-portal` | `/api/*` (order, customer, auth) + دسترسی مستقیم Supabase |
| `backend`/Supabase | `whatsapp-broadcast-api` | می‌نویسد: `warranty_returns`, `order_requests` |
| `whatsapp-broadcast-api` | `admin-panel` | مسیرهای admin تبلیغ‌شده اما پیاده‌نشده → ۴۰۴ (ghost) |

**قاعده:** همه frontendها به `backend` به‌عنوان منبع دادهٔ واحد (Supabase) وابسته‌اند.

---

## Legacy, Generated, and Unknown Files

### Confirmed generated
- `messenger-app/bundle.min.js` (خروجی `build:min`)
- `messenger-app/bundle.js` / `bundle.dev.js` / `bundle.tmp.js` (خروجی‌های build)
- backend/admin-panel/wholesale: generated ندارند.

### Confirmed legacy / deprecated
- `wholesale-portal/dashboard.html` (LEGACY duplicate)
- `wholesale-portal/wholesale-dashboard.jsx` (ORPHAN — لود نمی‌شود)
- `messenger-app/modules/*` (DEAD CODE — در زنجیره build نیست)
- `wholesale-portal/*.bak` / `*.backup-*` / `*.bak-deeplink` / `*.backup-vanilla` / `dashboard.html.bak` (بکاپ)

### Unknown; do not edit until clarified
  - `messenger-app/_verify_permissions.js`, `add_rls_policy.js`, `_server.js` (ابزاری؛ اکنون با `.vercelignore` از deploy خارج شدند)
- `wholesale-portal/debug_check.js`, `debug_check2.js`, `check_local.js`, `check_end.js`, `check_deploy.js`, `test_syntax.js`, `test.html`, `simple-test.html` (debug/test؛ عمومی)
- `whatsapp-broadcast-api` مسیرهای admin تبلیغ‌شده بدون پیاده‌سازی (ghost)

> هیچ فایلی بدون evidence در legacy قرار داده نشده است.

---

## Known Security Follow-ups

1. **messenger public tooling files:** `_verify_permissions.js`, `add_rls_policy.js`, `_server.js` و
   bundleهای غیرِمین روی static deploy عمومی‌اند → آرشیو/exclude با `.vercelignore`.
   (صفحات auth-bypass `test-login.html`/`inject.html` در تسک قبلی به `_security_archive/*.bak` منتقل
   و با `.vercelignore` از deploy خارج شدند — بسته شد.)
2. **users active contract:** ستون `active` روی `users` تأیید نشده؛ GET برنمی‌گرداند؛ PUT/POST آن را drop
   می‌کنند. toggle در UI صرفاً نمایشی است. رفع: افزودن ستون+قرارداد یا حذف toggle از UI.
3. **wholesale API base / frontend Supabase exposure:** `API_BASE` اکنون resolver دارد (override بدون
   hardcode جدید؛ فال‌بک همان URL تولید) — تسک cleanup. کلاینت مستقیم Supabase anon (نوشتن در
   `notifications`/`customers`) همچنان در مرورگر است → انتقال به پروکسی بک‌اند (`/api/notifications`) +
   بازبینی RLS + چرخش anon key در صورت افشا.
4. **webhook authentication:** تأیید امضای UltraMsg در `whatsapp-broadcast-api/api/webhook.js`
   (در این تسک verified نشد؛ فعلاً UNKNOWN).
5. **ghost WhatsApp routes:** `whatsapp-broadcast-api/vercel.json` مسیرهای admin بی‌پیاده‌سازی تبلیغ
   می‌کند → UI مدیریت WhatsApp در admin-panel ۴۰۴. حذف مسیرهای ghost یا پیاده‌سازی.

---

## Known Contract Gaps

- **active field:** در schema/contract کاربران نیست (جستار Security Follow-ups ۲).
- **role/system_role mapping:** احراز هویت بک‌اند از `system_role` استفاده می‌کند؛ AccessModule در
  admin-panel `role` (نمایشی) می‌فرستد و بک‌اندِ hardened، `role`+`system_role` را فیلد امتیازیِ
  گیت‌شده به `requireSuperAdmin` می‌داند. POST/PUT اکنون whitelist شده‌اند (hardening `users.js`).
- **backend route parity:** قبلاً `server.js` (Render) ۶ مسیر کمتر از `api/index.js` (Vercel) داشت
  (`portal-login-retail`، `roles`، `role-permissions`، `groups`، `crm-draft-orders`، `whatsapp-rules`)؛
  در تسک alignment هر ۶ مسیر به `server.js` اضافه شدند → parity برقرار است (تفاوت فقط در catch-all fallback).
- **missing WhatsApp management endpoints:** admin-panel انتظار UI مدیریت WhatsApp دارد اما بک‌اند/
  webhook پیاده‌سازی ندارد (ghost routes).
- **project control / performance:** `avg_completion_time_days` در reports.js از `task_status_history`
  محاسبه می‌شود (نه ستون `completed_at`) و فقط هنگام نبود رکورد APPROVED nullable است — پس به
  migration `completed_at` وابسته نیست.   وابستگی `completed_at` فقط در `project-tasks.js` (نوشتن
  هنگام APPROVED/REJECTED/ARCHIVED/BLOCKED) است. RLS برای ۳ جدول
  (`task_progress_updates`/`task_blockers`/`meeting_action_items`) سیاست ندارد (addendum پیشنهادی
  آماده؛ جزئیات در `docs/DB_MIGRATION_READINESS.md`). `TERMINAL_STATUSES` تکرار شده (یکسان)؛ تب
  projects در messenger-app دمو/محلی است.
  **شکاف ارزیابی عملکرد:** endpoint `GET /api/reports/users/performance` در admin-panel UI ندارد
  (تب «گزارشات» CRM sales است).

---

## Change Safety Checklist

قبل از تغییر هر app:
1. `docs/DEVELOPMENT_RULES.md` خوانده شود.
2. target app مشخص شود.
3. source-of-truth از این فایل تأیید شود.
4. فایل generated/legacy تغییر نکند (`bundle.min.js`، `modules/*`، `dashboard.html`، `*.bak`).
5. smoke test مخصوص همان app اجرا شود:
   - backend: `npm run check:preflight` + `node -c backend/server.js backend/api/index.js`
   - messenger-app: `npm run build:min` (پس از تغییر `components/index.jsx`)
   - admin-panel / wholesale-portal: بررسی static/browser
6. deploy فقط با درخواست صریح (و عبور از preflight gate).

---

> آخرین بازبینی: ۱۴۰۵/۰۴/۲۳ — Performance Evaluation completion: بررسی قرارداد انجام شد؛ reports.js از task_status_history (نه completed_at) استفاده می‌کند و به migration وابسته نیست؛ route parity (/api/reports) تأیید شد؛ شکاف اصلی = نبود UI ارزیابی کارمندی در admin-panel (تب گزارشات فقط CRM sales)؛ جدول evaluation اختصاصی وجود ندارد. تغییر کد: صفر (فقط اصلاح factual در این سند).

> آخرین بازبینی: ۱۴۰۵/۰۴/۲۳ — افزودن `POST /api/reports/performance/calculate` (handler جدید `performance-reports.js` + mount در `server.js` و `api/index.js` با رعایت route parity قبل از `/api/reports`). مستندات و smoke test در این سند ثبت شد. وضعیت: endpoint عملیاتی (۲۰۰ + upsert در `performance_scores` تأیید شد)؛ migration در مرحلهٔ cleanup از FK اشتباه به `users` پاکسازی شد (حالا `user_id` بدون REFERENCES است).

---

## Architecture Blueprints

- **Omnichannel AI Communication & Growth Agent Blueprint** — `docs/OMNICHANNEL_AI_AGENT_BLUEPRINT.md`
  - **Status:** *Proposed — pending implementation approval* (تسک D0، ۱۴۰۵/۰۴/۲۳)
  - **سرویس‌های درگیر:** `backend/` (مالک آینده orchestration/داده/سیاست)، `whatsapp-broadcast-api/` (adapter ورودی/خروجی WhatsApp)، `admin-panel/` (AI Agent Center)، `messenger-app/` (Unified Inbox / AI Copilot). `wholesale-portal/` فعلاً خارج از scope.
  - **پیش‌نیاز امنیتی:** تأیید امضای وب‌هوک در `whatsapp-broadcast-api/` — طبق بازبینی D0 وضعیت **ABSENT** ثبت شد (جزئیات در سند Blueprint، بخش ۱۶).
