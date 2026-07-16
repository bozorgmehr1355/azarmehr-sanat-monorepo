# Service Health Matrix

> آخرین به‌روزرسانی: ۱۴۰۵/۰۴/۲۴ — بر اساس evidence مراحل ۱ تا ۹ (AZARMEHR EXECUTION LOCK)
>
> محدوده این به‌روزرسانی: فقط ۵ سرویس
> (`wholesale-portal/`، `admin-panel/`، `messenger-app/`، `backend/`، `whatsapp-broadcast-api/`).
>
> در مراحل ۱–۹ هیچ **deploy**، **migration**، **install**، یا **تست runtime production** انجام نشد.
> بنابراین طبق `AGENTS.md` (بخش پیش از commit/deploy → مرحله ۳):
> «اگر سرویسی قابل تست نیست → وضعیت **UNKNOWN** ثبت شود، نه OK».
>
> - وضعیت‌های runtime / deploy / DB-live همگی **UNKNOWN** یا **PARTIAL** هستند.
> - endpoint ممنوعه `azarmehr-backend-main.vercel.app` در هیچ کد فعالی یافت نشد
>   (فقط در متن rule مستندات و legacy `*.bak-deeplink` — STEP 7/8).
> - هیچ `API_BASE` جدیدی در کد فعال backend hardcode نشد (STEP 8/PROJECT_MAP).

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
| **backend/** | backend/ | ✅ PASS | ⚠️ UNKNOWN/BLOCKED | ⚠️ UNKNOWN | ⚠️ migration pending | untracked (??) | ✅ تمیز | ✅ تمیز | ⚠️ PARTIAL |
| **admin-panel/** | admin-panel/index.html | ✅ موجود | ⚠️ UNKNOWN | ⚠️ UNKNOWN | proxy + anon | nested .git | ✅ تمیز | ✅ resolver | ⚠️ UNKNOWN |
| **messenger-app/** | components/index.jsx | ✅ pipeline | ⚠️ UNKNOWN | ⚠️ UNKNOWN | وابسته backend | untracked (??) | ✅ تمیز | ✅ resolver | ⚠️ UNKNOWN |
| **wholesale-portal/** | wholesale-portal/index.html | ✅ موجود | ⚠️ UNKNOWN | ⚠️ UNKNOWN | anon + backend | untracked (??) | ✅ تمیز* | ✅ resolver | ⚠️ UNKNOWN |
| **whatsapp-broadcast-api/** | api/webhook.js | ✅ موجود | ⚠️ UNKNOWN | ⚠️ UNKNOWN | warranty_returns | tracked | ✅ تمیز | N/A | ⚠️ UNKNOWN |

\* forbidden endpoint فقط در legacy `index.html.bak-deeplink:47` (دست‌نخورده طبق قوانین).

---

## جزئیات سرویس‌ها

### ۱) backend/

- **Source of truth path:** `backend/` (`handlers/*.js` + `api/index.js` + `server.js` + `handlers/_lib.js`/`_audit.js`)
- **Production/active path status:** Vercel → `backend/api/index.js`؛ Render → `backend/server.js`. هر دو همه handlerها را mount می‌کنند (STEP 1/2/8).
- **Legacy/deprecated ambiguity:** ندارد (طبق PROJECT_MAP همه handler فعالند).
- **Last verified evidence:** STEP 8 (`node -c` روی ۵۲ handler + entrypoints → PASS)؛ STEP 1/2 (route `/api/notifications` mounted + شاخه POST اضافه شد).
- **Static code health:** ✅ PASS (node -c همه فایل‌های واقعی).
- **Runtime health:** ⚠️ UNKNOWN/BLOCKED — `backend/node_modules` غایب؛ env/auth نامشخص؛ هیچ HTTP runtime اجرا نشد (STEP 3/6/8).
- **Deploy health:** ⚠️ UNKNOWN/PARTIAL — deploy توسط من انجام نشد؛ ادعای قبلی «✅ OK / 38 route» توسط مراحل ۱–۹ تأیید نشد.
- **DB/migration dependency:** جدول `notifications` → migration ساخته شد (`supabase/create-notifications-table.sql`، STEP 5) اما **اجرا نشد**؛ live table **تأیید نشده** (STEP 6/8).
- **Env/auth dependency:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_KEY`, `JWT_SECRET` (`handlers/_lib.js:5-7`) — وضعیت UNKNOWN (مقدار بررسی نشد، طبق strict mode).
- **Git/governance status:** `backend/` در ریشه **untracked (??)** — commit نشده (STEP 7/8/9).
- **Forbidden endpoint status:** ✅ تمیز — grep backend برای `azarmehr-backend-main.vercel.app` / `vercel.app` / `API_BASE` → No files (STEP 8).
- **Hardcoded API_BASE status:** ✅ تمیز — هیچ `API_BASE` جدید در backend active code (STEP 8).
- **Open blockers:**
  1. `node_modules` غایب → preflight/runtime غیرممکن.
  2. migration اجرا نشده → جدول `notifications` در DB نیست.
  3. env/auth نامشخص.
  4. `backend/package.json` فاقد `check:preflight` (فقط در root وجود دارد).
- **Current health verdict:** ⚠️ PARTIAL
- **Next required gate:** اجرای migration روی target (plan + تأیید مالک + staging/prod) → runtime e2e → `npm run check:preflight` (پس از `npm install`) → deploy با تأیید مالک.

### ۲) admin-panel/

- **Source of truth path:** `admin-panel/index.html` (تک‌فایله SPA)
- **Production/active path status:** `index.html` فعال؛ `POST /api/notifications` در خط ۱۷۹۵ (اکنون مطابق backend handler دارای POST — STEP 1/2).
- **Legacy/deprecated ambiguity:** `admin-panel/.git` **nested repo مستقل** (remote `azarmehr-admin.git`) — fragmentation (STEP 7)؛ `dashboard.html` LEGACY (PROJECT_MAP).
- **Last verified evidence:** STEP 7/8/9 git status → `admin-panel/` در ریشه untracked؛ داخل nested repo `M index.html`. **ادعای قبلی «۵ فایل حذف‌شده / BROKEN» در وضعیت فعلی تأیید نشد** (فایل‌ها موجودند).
- **Static code health:** ✅ `index.html` موجود.
- **Runtime health:** ⚠️ UNKNOWN — اجرا نشد.
- **Deploy health:** ⚠️ UNKNOWN — URL `azarmehr-admin.vercel.app` توسط من تست نشد (ادعای قبلی 404 unverified).
- **DB/migration dependency:** اعلان‌ها via backend proxy (`/api/notifications`)؛ همچنین نوشتن مستقیم Supabase anon (security follow-up — PROJECT_MAP).
- **Env/auth dependency:** JWT از backend؛ `API_BASE` resolver-based.
- **Git/governance status:** nested `.git` مستقل؛ untracked تحت ریشه؛ **NOT a submodule**.
- **Forbidden endpoint status:** ✅ تمیز در `index.html` فعال (فقط legacy `index.html.bak-deeplink:47` — STEP 7).
- **Hardcoded API_BASE status:** ✅ بدون hardcode جدید (resolver) — STEP 8/PROJECT_MAP.
- **Open blockers:** nested-git fragmentation (governance)؛ deploy URL unverified.
- **Current health verdict:** ⚠️ UNKNOWN
- **Next required gate:** تصمیم nested `.git` + تأیید deploy URL قبل از هر ادعای OK.

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
| DB Source-of-Truth Gate (`node scripts/check-db-source-of-truth.js`) | ⚠️ UNKNOWN | در مراحل ۱–۹ اجرا نشد (`node_modules` غایب؛ strict mode اجازه `npm install` نداد). ادعای قبلی «✅ OK» توسط من تأیید نشد. |
| Regression Safety Gate (`node scripts/check-regression-safety.js`) | ⚠️ UNKNOWN | مشابه بالا؛ اجرا نشد. |

---

## بلوکرهای باز (از مراحل ۱–۹)

1. **notifications DB:** شاخه POST پیاده‌شد (STEP 2) اما migration اجرا نشد → جدول `notifications` در DB تأیید نشده.
2. **node_modules غایب** در backend → preflight/runtime غیرممکن.
3. **env/auth نامشخص** (بررسی نشد، طبق strict mode).
4. **Governance/Git fragmentation:** nested `.git` (admin-panel)؛ ~۲۹ مسیر untracked؛ `backend/` untracked؛ `docs/DEVELOPMENT_RULES.md` M (STEP 8)؛ `AGENTS.md` M (STEP 9 — refs اصلاح شد).
5. **Deploy health** همه سرویس‌ها تست نشد → UNKNOWN.

---

## اولویت رفع (به‌روزرسانی‌شده)

```
۱. backend: اجرای migration notifications (plan + تأیید مالک + staging/prod)
۲. backend: npm install + npm run check:preflight (پس از migration)
۳. backend: runtime e2e notifications (POST→۲۰۱، GET→list، PATCH→read=true)
۴. governance: تصمیم nested .git (admin-panel) — بدون تأیید مالک دست‌زده نشود
۵. admin-panel / wholesale-portal / messenger-app: تأیید deploy URLs + بررسی security follow-ups
۶. whatsapp-broadcast-api: تست webhook GET + ایجاد health.js (طبق ممیزی قبلی)
۷. commit/stage فقط با تأیید صریح مالک (خارج از Execution Lock فعلی)
```

> هیچ موردی در این به‌روزرسانی به‌عنوان «system is healthy / OK» تأیید نشده است.
> تمام وضعیت‌های deploy/runtime/DB-live بر اساس شواهد ایستا (static) هستند و بقیه UNKNOWN است.
