# Service Health Matrix

> آخرین به‌روزرسانی: ۱۴۰۵/۰۵/۰۹ — بر اساس smoke test فاز ۱ + فعال‌سازی RLS + گیت‌های preflight
>
> در این به‌روزرسانی، شواهد **محلی** جدید ثبت شد: فاز ۱ (تسک/شواهد/صورت‌جلسه/موتور AI) با
> smoke test ۱۶ سناریو روی استک محلی (server.js + Supabase local) تأیید شد و RLS روی
> جداول فاز ۱ فعال گردید. **هیچ deploy یا تست production جدیدی انجام نشد** — وضعیت deploy همه سرویس‌ها همچنان UNKNOWN است.
>
> **به‌روزرسانی ۱۴۰۵/۰۵/۰۹ (جلسه refactor پنل):** admin-panel به معماری ماژولار (Vite + React + TypeScript)
> بازنویسی و با داده **زنده از backend دپلوی‌شده** (داشبورد، سفارشات، گارانتی، پرداخت‌ها، پروژه‌ها، چت)
> در پیش‌نمایش محلی (vite preview) runtime-verified شد. اعتبارسنجی: `npm run build` ✅ (tsc + vite، ۴۴ ماژول)،
> لاگین JWT واقعی + جدول سفارشات با تاریخ جلالی. Deploy همچنان ⚠️ UNKNOWN.
>
> طبق `AGENTS.md` (مرحله ۳ پیش از commit/deploy): «اگر سرویسی قابل تست نیست → وضعیت UNKNOWN ثبت شود، نه OK».
>
> - وضعیت‌های runtime/deploy در production همچنان **UNKNOWN** هستند.
> - فاز ۱ (backend) تنها در استک **محلی** verified است.

---

## تفسیر وضعیت‌ها

| وضعیت | معنی |
|-------|-------|
| ✅ PASS | کد استاتیک سالم است؛ runtime/deploy تست نشده ولی شکاف شناخته‌شده‌ای مانع نیست |
| ⚠️ PARTIAL | بخشی آماده (مثلاً static)، بخشی بلوکه (runtime/DB/deploy) |
| ⚠️ UNKNOWN | قابل تست نیست (node_modules غایب، env نامشخص، deploy تست نشده) — ادعای OK ممنوع |
| ❌ BROKEN | کد وجود دارد ولی شکست قطعی تأییدشده (در وضعیت فعلی تأیید نشد) |

---

## Matrix (خلاصه)

| سرویس | SoT | Static | Runtime | Deploy | DB/Migration | Git/Gov | Forbidden EP | Hard API_BASE | Verdict |
|-------|-----|--------|---------|--------|--------------|---------|--------------|---------------|---------|
| **backend/** | backend/ | ✅ PASS | ✅ local smoke (فاز ۱) | ⚠️ UNKNOWN | ✅ RLS enabled (mig 00000-00003) | فاز ۱ committed | ✅ تمیز | ✅ تمیز | ⚠️ PARTIAL |
| **admin-panel/** | admin-panel/index.html | ✅ موجود | ⚠️ UNKNOWN | ⚠️ UNKNOWN | proxy + anon | nested .git | ✅ تمیز | ✅ resolver | ⚠️ UNKNOWN |
| **messenger-app/** | components/index.jsx | ✅ pipeline | ⚠️ UNKNOWN | ⚠️ UNKNOWN | وابسته backend | untracked (??) | ✅ تمیز | ✅ resolver | ⚠️ UNKNOWN |
| **wholesale-portal/** | wholesale-portal/index.html | ✅ موجود | ⚠️ UNKNOWN | ⚠️ UNKNOWN | anon + backend | untracked (??) | ✅ تمیز* | ✅ resolver | ⚠️ UNKNOWN |
| **whatsapp-broadcast-api/** | api/webhook.js | ✅ موجود | ⚠️ UNKNOWN | ⚠️ UNKNOWN | warranty_returns | tracked | ✅ تمیز | N/A | ⚠️ UNKNOWN |

\* forbidden endpoint فقط در legacy `index.html.bak-deeplink:47` (دست‌نخورده طبق قوانین).

---

## جزئیات سرویس‌ها

### ۱) backend/

- **Source of truth path:** `backend/` (`handlers/*.js` + `api/index.js` + `server.js` + `handlers/_lib.js`/`_audit.js` + `services/*.js`)
- **Production/active path status:** Vercel → `backend/api/index.js`؛ Render → `backend/server.js`. هر دو مسیر فاز ۱ (tasks/meeting-minutes/ai-agent) را mount می‌کنند (۱۴۰۵/۰۵/۰۹).
- **Legacy/deprecated ambiguity:** `handlers/meetings.js` و `handlers/ai-drafts.js` legacy دست‌نخورده‌اند؛ `/api/meetings` دیگر به legacy مونت نیست.
- **Last verified evidence:** smoke test فاز ۱ → **۱۶ ✅ / ۰ ❌** (۱۴۰۵/۰۵/۰۹)؛ `node -c` همه فایل‌ها ✅؛ preflight هر دو گیت ✅.
- **Static code health:** ✅ PASS (node -c همه فایل‌های واقعی).
- **Runtime health:** ✅ **local verified** — `server.js` روی پورت محلی اجرا شد؛ تسک/شواهد/صورت‌جلسه/موتور AI/Auth gate/405 همه تأیید شدند. (production هنوز تست نشده → Deploy ⚠️ UNKNOWN)
- **Deploy health:** ⚠️ UNKNOWN — deploy در این مرحله انجام نشد.
- **DB/migration dependency:** مایگریشن‌های فاز ۱ (`20260731000000` تا `20260731000003`) روی دیتابیس **محلی** اعمال و verified شدند؛ RLS روی هر ۵ جدول فاز ۱ فعال است.
- **Env/auth dependency:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_KEY`, `JWT_SECRET` (`handlers/_lib.js`) — موجود در `.env` محلی.
- **Git/governance status:** فایل‌های فاز ۱ + مستندات در commit این تاریخ ثبت شدند؛ تغییرات پیشین (crm-* و...) همچنان modified/untracked هستند.
- **Forbidden endpoint status:** ✅ تمیز — grep backend برای `azarmehr-backend-main.vercel.app` / `vercel.app` / `API_BASE` → No files.
- **Hardcoded API_BASE status:** ✅ تمیز — هیچ `API_BASE` جدید در backend active code.
- **Open blockers:**
  1. deploy production تست نشده (UNKNOWN).
  2. هیچ مصرف‌کننده UI هنوز روت‌های فاز ۱ را صدا نمی‌زند.
- **Current health verdict:** ⚠️ PARTIAL — backend محلی verified؛ production/deploy UNKNOWN.
- **Next required gate:** deploy + تست production + اتصال UI به روت‌های فاز ۱.

### ۲) admin-panel/

- **Source of truth path:** `admin-panel/src/` (ماژولار: React + Vite + TypeScript) → build → `dist/`؛ `index.html` تنها اسکلت build است
- **Production/active path status:** `npm run build` (tsc + vite)؛ پنل از `backend` دپلوی‌شده (`azarmehr-backend.vercel.app`) با JWT (localStorage `AZARMEHR_TOKEN`) تغذیه می‌شود
- **Legacy/deprecated ambiguity:** `admin-panel/.git` **nested repo مستقل** (remote `azarmehr-admin.git`) — fragmentation؛ `index.html.bak_20260731_141509` نسخه مونولیت قبلی (مرجع رول‌بک، untracked)؛ `dashboard.html` LEGACY
- **Last verified evidence (۱۴۰۵/۰۵/۰۹):** `npm run build` ✅ (tsc + vite، ۴۴ ماژول)؛ runtime در `vite preview` با **داده زنده** تأیید شد: لاگین JWT، داشبورد (۶۵ مشتری / ۵۲ سفارش / ارزش کل)، جدول سفارشات با تاریخ جلالی، کشوی منوی موبایل و ناوبری. گیت‌های preflight ✅ (۸۶/۰ db-source).
- **Static code health:** ✅ PASS — build سبز؛ بدون خطای tsc.
- **Runtime health:** ✅ **local verified** — پیش‌نمایش محلی + اتصال زنده به API دپلوی‌شده (در این جلسه).
- **Deploy health:** ⚠️ UNKNOWN — deploy جدید روی Vercel در این جلسه انجام نشد.
- **DB/migration dependency:** دسترسی به دیتابیس فقط از طریق backend (JWT)؛ بدون نوشتن مستقیم Supabase anon در کد جدید.
- **Env/auth dependency:** JWT از `POST /api/login`؛ `API_BASE` resolver-based با fallback `azarmehr-backend.vercel.app`.
- **Git/governance status:** nested `.git` مستقل؛ تغییرات فعلی در شاخه `refactor/modular-admin` ریپوی ریشه ثبت می‌شوند.
- **Forbidden endpoint status:** ✅ تمیز.
- **Hardcoded API_BASE status:** ✅ resolver + fallback (بدون hardcode جدید).
- **Open blockers:** nested-git fragmentation (governance)؛ deploy URL unverified؛ فایل‌های legacy untracked در `src/modules/` (پاک‌سازی‌شده‌ها به `_backups/` منتقل شدند).
- **Current health verdict:** ⚠️ PARTIAL — runtime local verified؛ deploy UNKNOWN.
- **Next required gate:** deploy + تست production قبل از هر ادعای OK.

### ۳) messenger-app/

- **Source of truth path:** `messenger-app/components/index.jsx` → build → `bundle.min.js` (GENERATED)
- **Production/active path status:** `index.html` ← `bundle.min.js`
- **Legacy/deprecated ambiguity:** `messenger-app/modules/*` DEAD CODE؛ `_verify_permissions.js` و غیره unknown/utility (`.vercelignore`) — PROJECT_MAP.
- **Last verified evidence:** git status → `messenger-app/` untracked تحت ریشه (موجود). **ادعای قبلی «۱۴ ماژول core حذف‌شده / BROKEN» در وضعیت فعلی تأیید نشد.**
- **Static code health:** ✅ pipeline موجود؛ `bundle.min.js` generated.
- **Runtime health:** ⚠️ UNKNOWN — `npm install` نشد، اجرا نشد.
- **Deploy health:** ⚠️ UNKNOWN — URL تست نشد.
- **DB/migration dependency:** وابسته backend.
- **Env/auth dependency:** JWT backend.
- **Git/governance status:** untracked تحت ریشه.
- **Forbidden endpoint status:** ✅ تمیز.
- **Hardcoded API_BASE status:** ✅ resolver-based (PROJECT_MAP).
- **Open blockers:** `bundle.min.js` ممکن است stale باشد اگر `components` تغییر کرده باشد؛ deploy unverified.
- **Current health verdict:** ⚠️ UNKNOWN
- **Next required gate:** `npm run build:min` پس از تغییر `components` + تأیید deploy.

### ۴) wholesale-portal/

- **Source of truth path:** `wholesale-portal/index.html` (static تک‌فایله)
- **Production/active path status:** `index.html`؛ `API_BASE` resolver (PROJECT_MAP).
- **Legacy/deprecated ambiguity:** `dashboard.html` LEGACY؛ `wholesale-dashboard.jsx` ORPHAN؛ `*.bak` (PROJECT_MAP).
- **Last verified evidence:** git status → `wholesale-portal/` untracked تحت ریشه (موجود). **ادعای قبلی «۱۸ فایل حذف‌شده / BROKEN» تأیید نشد.**
- **Static code health:** ✅ `index.html` موجود.
- **Runtime health:** ⚠️ UNKNOWN.
- **Deploy health:** ⚠️ UNKNOWN — طبق PROJECT_MAP هیچ URL استقرارِ تأییدشده‌ای وجود ندارد (UNKNOWN).
- **DB/migration dependency:** نوشتن مستقیم Supabase anon (security follow-up)؛ وابسته backend.
- **Env/auth dependency:** `SUPABASE_URL`/`SB` anon در مرورگر.
- **Git/governance status:** untracked تحت ریشه.
- **Forbidden endpoint status:** ✅ فقط legacy `index.html.bak-deeplink:47` (STEP 7).
- **Hardcoded API_BASE status:** ✅ resolver؛ fallback همان URL تولید (`azarmehr-backend.vercel.app`) — بدون hardcode جدید.
- **Open blockers:** security follow-ups (فایل‌های debug/test عمومی سرو می‌شوند؛ افشای anon key)؛ deploy URL unverified.
- **Current health verdict:** ⚠️ UNKNOWN
- **Next required gate:** رفع security follow-ups + تأیید deploy URL.

### ۵) whatsapp-broadcast-api/

- **Source of truth path:** `whatsapp-broadcast-api/api/webhook.js` (تنها endpoint زنده)
- **Production/active path status:** Vercel `api/webhook.js`.
- **Legacy/deprecated ambiguity:** `vercel.json` ghost admin routes (حذف شد در P1.1.2-A طبق PROJECT_MAP؛ اما contract gaps هنوز ذکر می‌کند).
- **Last verified evidence:** در مراحل ۱–۹ تست نشد؛ بر اساس ممیزی قبلی: webhook GET 200، `health.js` مفقود.
- **Static code health:** ✅ `webhook.js` موجود.
- **Runtime health:** ⚠️ UNKNOWN (توسط من تست نشد).
- **Deploy health:** ⚠️ UNKNOWN.
- **DB/migration dependency:** می‌نویسد `warranty_returns`, `order_requests` (طبق AGENTS.md).
- **Env/auth dependency:** `ULTRAMSG_WEBHOOK_SECRET` gate (P0، constant-time) — وضعیت UNKNOWN.
- **Git/governance status:** تحت ریشه tracked (در لیست untracked دیده نشد).
- **Forbidden endpoint status:** ✅ تمیز.
- **Hardcoded API_BASE status:** N/A (webhook).
- **Open blockers:** `health.js` مفقود (طبق ممیزی قبلی)؛ ghost routes (contract gap).
- **Current health verdict:** ⚠️ UNKNOWN (ممیزی قبلی: PARTIAL/جزئی — توسط من تأیید نشد).
- **Next required gate:** تست webhook GET + بررسی intent pipeline.

---

## گیت‌های فراملی (cross-cutting)

| گیت | وضعیت | توضیح |
|-----|-------|-------|
| DB Source-of-Truth Gate (`node scripts/check-db-source-of-truth.js`) | ✅ PASS | ۸۶/۸۶ پاس (۱۴۰۵/۰۵/۰۹) — بدون hardcoded postgres URL، بدون env ممنوعه، بدون `.env` tracked |
| Regression Safety Gate (`node scripts/check-regression-safety.js`) | ✅ PASS | ۱۳/۱۳ پاس (۱۴۰۵/۰۵/۰۹) — بدون secret، مستندات الزامی موجود، بدون نقض SoT |

---

## فاز ۱ — تسک/شواهد/صورت‌جلسه/موتور AI + RLS (۱۴۰۵/۰۵/۰۹)

### شواهد محلی (local stack)

| مورد | وضعیت | شاهد |
|------|-------|------|
| روت‌های فاز ۱ (tasks/meetings/ai-agent) | ✅ | smoke test: `node backend/test-tasks-meetings-ai-smoke.js` → **۱۶ ✅ / ۰ ❌** |
| گیت احراز هویت | ✅ | GET بدون توکن → 401 |
| وضعیت‌ها و شواهد تسک | ✅ | PENDING_ACK ← … ← PENDING_REVIEW (بدون شاهد → 400) |
| تبدیل اکشن‌آیتم به تسک | ✅ | 201 |
| موتور AI (DRAFT ← APPROVED/REJECTED) | ✅ | approve تکراری → 400؛ reject با دلیل → 200 |
| زیرمسیر legacy تحت هندلر جدید | ✅ | 405 |
| سینتکس | ✅ | `node -c` همه فایل‌ها |
| مایگریشن‌ها | ✅ | 00000–00003 روی دیتابیس محلی اعمال شد |

### RLS — جداول فاز ۱

| جدول | RLS | وضعیت دسترسی |
|------|-----|--------------|
| `tasks` | ✅ فعال | deny-all — فقط `service_role` (BYPASSRLS) |
| `task_evidences` | ✅ فعال | deny-all |
| `meeting_minutes` | ✅ فعال | deny-all |
| `audit_logs` | ✅ فعال | deny-all |
| `ai_drafts` | ✅ فعال | deny-all |

- اثبات: anon بدون گرنت → 42501؛ anon با گرنت آزمایشی → `[]` (فیلتر RLS)؛ سرویس‌رول → کار می‌کند.
- مایگریشن: `supabase/migrations/20260731000003_enable_rls_phase1.sql` (اعمال‌شده روی دیتابیس محلی).
- ⚠️ مایگریشن‌های فاز ۱ هنوز در **production** اعمال نشده‌اند.

---

## بلوکرهای باز (۱۴۰۵/۰۵/۰۹)

1. **deploy production** همه سرویس‌ها تست نشده → UNKNOWN.
2. **مایگریشن‌های فاز ۱** در production اعمال نشده (00000–00003 فقط روی دیتابیس محلی).
3. **اتصال UI** به روت‌های فاز ۱ انجام نشده (هیچ مصرف‌کننده‌ای در ریپو).
4. **Governance/Git fragmentation:** تغییرات پیشین backend (crm-* و...) همچنان modified/untracked؛ nested `.git` (admin-panel).
5. **دسترسی مستقیم کلاینت** به جداول فاز ۱ در آینده نیازمند تعریف policy + گرنت حداقلی است.

> ✅ **Notifications دیگر blocker نیست** — POST 201 / GET 200 در staging و production verified. جدول موجود است. بدون migration. بدون تغییر کد.

---

## اولویت رفع (پس از STEP 0 — مطابق PROJECT_EXECUTION_BASELINE)

```
STEP 1: RLS Gaps (task_progress_updates, task_blockers, meeting_action_items)
STEP 2: Ghost Routes (WhatsApp admin UI, vercel.json, broken admin-panel routes)
STEP 3: Contract Alignment (active field, role/system_role mapping, API shape)
STEP 4: Repo Hygiene (nested .git, untracked files, AGENTS.md refs)
STEP 5: MVP Smoke Matrix (auth, dashboard, projects, tasks, evidence, meetings, notifications, reports)
STEP 6: Omnichannel P1/P2 (audit domain/data model first)
STEP 7: AI Copilot MVP (knowledge policy, approval flow, human-in-the-loop)
```

> هیچ موردی در این به‌روزرسانی به‌عنوان «system is healthy / OK» تأیید نشده است.
> شواهد این به‌روزرسانی: فاز ۱ و RLS فقط در استک **محلی** verified هستند.
> تمام وضعیت‌های deploy و production همچنان **UNKNOWN** است.
