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

---

## ACTIVE PLAN — PROJECT EXECUTION BASELINE

این بخش جایگزین EXECUTION LOCK قبلی است. از این لحظه به بعد، **`docs/PROJECT_EXECUTION_BASELINE.md`** سند governing اصلی است.

### Verdict Update

- **وضعیت:** MVP STABILIZATION — بین Design Complete و MVP Stabilization.
- **Notifications:** ✅ **RESOLVED / VERIFIED** — POST 201 / GET 200 در staging و production. جدول موجود. بدون migration. بدون تغییر کد.
- **علت:** production backend outdated بود (کد قدیمی deploy شده بود). با `vercel --prod` از source فعلی رفع شد.
- **Feature Freeze:** فعال — تا پایان Stabilization feature جدید ممنوع است (مگر با approval صریح).

### Source Hierarchy (from BASELINE)

1. `PROJECT_MAP.md` — نقشه مونورپو و مسیرهای معتبر
2. `DEVELOPMENT_RULES.md` — قانون اجرا (این سند)
3. `PROJECT_TASK_EVIDENCE_AI_MVP_PLAN.md` — نقشه MVP
4. `PROJECT_EXECUTION_BASELINE.md` — **فرمان اجرایی:** اولویت‌ها، فریز feature، ترتیب اجباری گام‌ها
5. `OMNICHANNEL_AI_AGENT_BLUEPRINT.md` — معماری بلندمدت
6. گزارش‌های verified smoke test — evidence اجرایی

### Step Order (Mandatory — from BASELINE)

```
STEP 0: Sync Reality ✅ (DONE — notifications dokumentasi sync)
STEP 1: RLS Gaps (task_progress_updates, task_blockers, meeting_action_items)
STEP 2: Ghost Routes (WhatsApp admin UI, vercel.json, broken admin-panel routes)
STEP 3: Contract Alignment (active field, role/system_role, API shape)
STEP 4: Repo Hygiene (nested .git, untracked files, AGENTS.md refs)
STEP 5: MVP Smoke Matrix (auth, dashboard, projects, tasks, evidence, meetings, notifications, reports)
STEP 6: Omnichannel P1/P2 (domain/data model audit first)
STEP 7: AI Copilot MVP (knowledge policy, approval flow, human-in-the-loop)
```

### Hard Rules (از BASELINE + حفظ‌شده)

- **No migration** without plan, backup note, staging verification, and owner approval.
- **No production migration** without separate production approval.
- **No deploy** without preflight, smoke test, and rollback point.
- **No AI automation** without audit, approval, and knowledge grounding.
- **No advertised route** without a real destination.
- **No secret exposure** — never print tokens/env/cookies/JWT.
- **No hardcoded API_BASE** — use resolver pattern.
- **Forbidden endpoint:** `azarmehr-backend-main.vercel.app`.
- **Legacy protection:** don't touch legacy/deprecated without explicit owner approval.
- **PROJECT_START_RULE — Contract-First + End-to-End Gate:** before starting any task, enforce the following end-to-end contract gate (applies per target service):
  1. **One target only** — work on exactly one app/service per task; never edit another service's source-of-truth in the same change.
  2. **Source of truth first** — identify and read the target's source-of-truth (per PROJECT_MAP) before any edit; no change without confirming the SoT file.
  3. **API contract before UI** — define/confirm the API contract (path, method, payload, auth, response) before building or connecting any frontend.
  4. **Backend handler/route before frontend connection** — the backend handler AND route must be registered in both entrypoints before the frontend is allowed to call it (no frontend-first wiring to a missing endpoint).
  5. **Database contract before persistence** — the target table/columns must exist in the database source-of-truth before any insert/update; if absent, do NOT write to a guessed/inferred table and do NOT run a migration without plan + owner approval.
  6. **No Ghost Route gate** — every advertised/called endpoint must resolve to a real registered handler in its service's source-of-truth; an endpoint with no destination is a ghost route and must be fixed (handler added) or removed before done.
  7. **Required smoke test for same target** — run the target's own smoke test (syntax + method checks: OPTIONS/GET/POST invalid/POST valid as applicable) and confirm the route is live before marking done.
  8. **Deploy only after gates + owner approval** — no deploy without preflight passing, smoke test passing, rollback point, and explicit owner approval.
  9. **Definition of done / status labels** — a target is **DONE** only when: SoT identified, contract confirmed, handler+route registered, DB contract satisfied (or intentionally 503 with no migration), smoke test passed, and (if deployed) owner-approved. Use status labels **PASS / PASS_WITH_NOTE / BLOCKED / FAIL / UNKNOWN** consistently; never label a service OK unless actually tested per §۲ health rules.
- **If documentation conflicts with verified evidence:** update documentation before continuing.

### Feature Freeze (از BASELINE)

**ممنوع تا پایان Stabilization (مگر با approval صریح):**
- feature جدید خارج از MVP
- UI جدید بدون backend contract
- endpoint جدید بدون test plan
- migration بدون plan و backup
- deploy بدون preflight و smoke test
- AI Agent automation جدید بدون audit/approval/grounding
- route تبلیغ‌شده بدون فایل مقصد واقعی

**مجاز:**
- رفع blockerهای MVP (طبق step order)
- sync مستندات با evidence
- بستن RLS gaps
- حذف/اصلاح ghost routes
- contract alignment
- repo hygiene
- smoke test و preflight
