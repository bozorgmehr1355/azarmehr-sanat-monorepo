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

## AZARMEHR EXECUTION LOCK - ACTIVE PLAN

این سند **تنها برنامهٔ اجرایی مجاز** پروژه از این لحظه به بعد است. هر اقدام بعدی فقط از روی این سند انجام می‌شود. هر پیشنهاد خارج از این سند با عبارت **«OUT OF EXECUTION LOCK - NOT ALLOWED»** رد می‌شود.

### A) EXECUTION LOCK VERDICT

- **وضعیت:** PARTIAL / UNKNOWN — طبق `PROJECT_MAP.md` و `DEVELOPMENT_RULES.md` (آخرین بازبینی ۱۴۰۵/۰۴/۲۳)؛ پروژه operational نیست.
- **چهار blocker:** ۱) Notifications ناقص — `POST` پیاده‌نشده (۴۰۵ در `notifications.js:32`) + جدول `notifications` هیچ‌گاه migrate نشده (glob `supabase/*notif*` خالی). ۲) Migrationها روی دیتابیس زنده اجرا نشده‌اند. ۳) Deploy health تأیید نشده (URLهای wholesale/messenger UNKNOWN). ۴) Governance/Git fragmentation (nested `.git`، ۲۹ untracked، ۸ commit پیش از origin، refs اشتباه AGENTS.md).
- **Operational؟** خیر — PARTIAL/UNKNOWN.
- **اولین target اجباری:** `backend` (notifications).
- **چرا اول:** طبق قانون «Admin Panel endpoint را صدا می‌زند ولی backend handler [برای POST] ندارد → FIX اولویت»؛ خطای ۴۰۵ مستقیماً قابل بازتولید است (`admin-panel/index.html:1795` → ۴۰۵ در `notifications.js:32`).
- **ممنوع فعلاً:** deploy/push/commit/stage، اجرای migration، ساخت فایل مستند جدید، refactor، تغییر messenger/whatsapp، UI redesign.
- **خارج از scope:** meeting UI، performance UI، messenger-app، whatsapp، wholesale deploy، git cleanup.

### B) HARD EXECUTION LAW — الزام‌آور

۱) **One target only** — در هر لحظه فقط یکی: `admin-panel` / `backend` / `supabase` / `messenger-app` / `wholesale-portal` / `whatsapp-broadcast-api` / `docs/governance`.
۲) **One output only** — هر مرحله فقط یکی: `REPORT` / `FIX` / `TEST`.
۳) **No branching** — تا مرحلهٔ جاری PASS نشده: سراغ target دیگر نرو، issue جدید نساز، UI جدید طراحی نکن، refactor نکن، docs جدید نساز، deploy نکن، migration اجرا نکن، تست غیرمرتبط نزن.
۴) **No docs sprawl** — هیچ فایل مستند جدید ساخته نشود؛ گزارش فقط در خروجی چت. تغییر مستند فقط به‌عنوان FIX جداگانه و با اجازهٔ مالک.
۵) **No fix without evidence** — هر FIX پیش‌زمینه دارد: file path + line number + route/API + expected + actual + risk.
۶) **No migration without migration plan** — ترتیب فایل‌ها + DROP/ALTER خطرناک + rollback/backup + اجازهٔ مالک + staging/prod مشخص.
۷) **No deploy without gates** — `npm run check:preflight` پاس + smoke همان سرویس پاس + target مشخص + اجازهٔ مالک.
۸) **No secret exposure** — هیچ secret/token/env/cookie/JWT/header چاپ نشود؛ فقط `SECRET_PRESENT` یا `SECRET_MISSING` بدون مقدار.
۹) **Forbidden endpoint** — استفاده از `azarmehr-backend-main.vercel.app` ممنوع.
۱۰) **No hardcoded API_BASE** — هیچ `API_BASE` جدید hardcode نشود.
۱۱) **Legacy protection** — روی legacy/deprecated تغییر نده مگر مالک صریحاً تأیید کند.

### C) SINGLE EXECUTION QUEUE

صف واحد و الزام‌آور (۱۰ مرحله). **فقط STEP 1 در حال حاضر UNLOCKED / قابل اجراست.** مراحل ۲ تا ۱۰ تا زمان PASS شدن پیش‌نیازهایشان **LOCKED** هستند.

**STEP 1** — REPORT / backend
- Goal: ثبت evidence دقیق شکاف notifications (POST→۴۰۵ + نبود جدول/میگریشن)
- Why now: بالاترین اولویت طبق قانون «Admin Panel endpoint را صدا می‌زند ولی backend handler [برای POST] ندارد»؛ مستقیماً قابل بازتولید
- Scope: فقط `notifications.js` + route mounting + فراخوان admin-panel + inventory میگریشن‌های supabase
- Files to read: `backend/handlers/notifications.js`, `backend/api/index.js` (خط ۶۳), `backend/server.js` (خط ۸۸/۱۳۸), `admin-panel/index.html` (خط ۱۷۹۵), `supabase/*` (glob)
- Files to change: هیچ‌کدام (REPORT)
- Commands allowed: read/grep/glob؛ `node -c backend/handlers/notifications.js`؛ بازخوانی خطوط
- Commands forbidden: edit/write/migration/deploy/git
- Exit criteria: ۴۰۵ برای POST تأیید شد؛ نبود migration جدول notifications مستند شد
- Smoke test: بازخوانی خط ۳۲ `notifications.js` + خط ۱۷۹۵ `index.html`
- Stop condition: اگر مشخص شد handler اصلاً mount نشده → اولویت‌بندی تجدید می‌شود
- Next step only if: ۴۰۵ تأیید شد و جدول `notifications` در هیچ migration یافت نشد

**STEP 2** — FIX / backend
- Goal: پیاده‌سازی شاخهٔ `POST` در `notifications.js` (ایجاد رکورد اعلان) با RBAC
- Why now: STEP 1 REPORT شد و ۴۰۵ تأیید شد
- Scope: فقط تابع handler (افزودن `req.method==='POST'`)
- Files to read: `backend/handlers/notifications.js`
- Files to change: `backend/handlers/notifications.js` (فقط افزودن POST branch)
- Commands allowed: edit فایل؛ `node -c backend/handlers/notifications.js`؛ `node -c backend/server.js backend/api/index.js`
- Commands forbidden: migration؛ deploy؛ تغییر فایل دیگر؛ تغییر route mounting
- Exit criteria: POST branch اضافه شد؛ node -c passed؛ GET/PATCH بی‌تغییر
- Smoke test: curl POST محلی → انتظار نبود ۴۰۵ (احتمال ۵۰۰ به‌خاطر نبود جدول → شواهد STEP 3)
- Stop condition: اگر نیاز به تغییر schema/users بود → توقف و گزارش
- Next step only if: کد POST نوشته شد و syntax OK

**STEP 3** — TEST / backend
- Goal: بازتولید درخواست admin-panel و تأیید رفع ۴۰۵؛ آشکار کردن وابستگی جدول
- Why now: STEP 2 FIX انجام شد
- Scope: فقط endpoint notifications (POST/GET/PATCH)
- Files to read: `backend/handlers/notifications.js`
- Files to change: هیچ‌کدام
- Commands allowed: curl POST/GET/PATCH محلی با توکن؛ `npm run check:preflight`
- Commands forbidden: deploy؛ migration؛ edit
- Exit criteria: ۴۰۵ دیگر بازنمی‌گردد؛ اگر ۵۰۰ به‌دلیل نبود جدول → ثبت به‌عنوان evidence STEP 4
- Smoke test: POST `/api/notifications` با توکن → ۲۰۱/۲۰۰ یا ۵۰۰ با پیام «relation notifications does not exist»
- Stop condition: اگر خطای غیرمنتظره (مثلاً auth) → توقف
- Next step only if: ۴۰۵ رفع شد (حتی اگر ۵۰۰ جدول دیده شد)

**STEP 4** — REPORT / supabase
- Goal: inventory migration لازم برای جدول `notifications` + ارزیابی DROP risk + تعیین staging/prod
- Why now: STEP 3 نشان داد جدول `notifications` وجود ندارد
- Scope: `supabase/*.sql`؛ فقط بررسی/شناسایی (اجرا نه)
- Files to read: `supabase/` تمام `.sql` (grep notifications)؛ `docs/DB_MIGRATION_READINESS.md`
- Files to change: هیچ‌کدام
- Commands allowed: read/grep/glob
- Commands forbidden: اجرای SQL؛ psql؛ هر نوشتن روی دیتابیس
- Exit criteria: مشخص شد کدام فایل جدول را می‌سازد؛ ترتیب؛ DROP/ALTER خطرناک ثبت شد؛ نیاز به owner approval ثبت شد
- Smoke test: — (REPORT)
- Stop condition: اگر migration با DROP خطرناک یافت شد → قبل از اجرا حتماً REPORT کامل + تایید مالک
- Next step only if: طرح migration + rollback/backup تأیید شد و مالک اجازه داد

**STEP 5** — FIX / supabase
- Goal: اجرای migration ساخت جدول `notifications` + RLS (با تایید مالک، با plan بکاپ/بازگشت، روی staging یا prod مشخص)
- Why now: STEP 4 تایید کرد و مالک اجازه داد
- Scope: فقط دستور ساخت جدول `notifications` + RLS
- Files to read: فایل migration انتخابی
- Files to change: (اجرا روی DB)؛ در صورت نیاز فایل migration جدید (با تایید مالک)
- Commands allowed: اجرای SQL روی target مشخص طبق plan
- Commands forbidden: DROP/ALTER بدون تایید؛ اجرا روی prod بدون تایید صریح
- Exit criteria: جدول `notifications` + RLS ایجاد شد؛ نوشتن تست شد
- Smoke test: INSERT/SELECT تستی روی جدول
- Stop condition: اگر اجرا شکست → بازگشت به بکاپ، توقف
- Next step only if: جدول ساخته شد و قابل نوشتن است

**STEP 6** — TEST / backend
- Goal: تست end-to-end notifications (POST/GET/PATCH) روی دیتابیس زنده
- Why now: جدول ساخته شد
- Scope: فقط notifications endpoint
- Files to read: `backend/handlers/notifications.js`
- Files to change: هیچ‌کدام
- Commands allowed: curl POST/GET/PATCH با توکن؛ preflight
- Commands forbidden: deploy؛ migration؛ edit
- Exit criteria: POST → ۲۰۱، GET → لیست، PATCH → read=true
- Smoke test: چرخه کامل اعلان
- Stop condition: اگر هنوز خطا → توقف و گزارش
- Next step only if: هر سه متد ۲xx

**STEP 7** — REPORT / docs/governance
- Goal: ارزیابی deploy health + تکه‌تکه بودن Git (nested `.git`، ۲۹ untracked، ۸ ahead، refs اشتباه AGENTS.md)
- Why now: blocker ۳ و ۴ هنوز باز است
- Scope: `SERVICE_HEALTH_MATRIX.md` (stale)؛ git status؛ refs AGENTS.md
- Files to read: `docs/SERVICE_HEALTH_MATRIX.md`؛ git status؛ `AGENTS.md` (Basteh.txt/fale.txt refs)
- Files to change: هیچ‌کدام
- Commands allowed: read/grep/glob؛ git status (با binary مسیر کامل)
- Commands forbidden: commit/push/deploy/edit
- Exit criteria: وضعیت health هر سرویس ثبت شد (OK/UNKNOWN/BROKEN)؛ گزینه‌های رفع fragmentation مستند شد
- Smoke test: — (REPORT)
- Stop condition: —
- Next step only if: مالک اجازه ادامه به تست/رفع داد

**STEP 8** — TEST / backend
- Goal: اجرای preflight + node -c + smoke روی سرویس تغییریافته برای تایید deploy-readiness
- Why now: قبل از هر deploy (ممنوع تا تایید مالک)
- Scope: backend preflight
- Files to read: `package.json` scripts
- Files to change: هیچ‌کدام
- Commands allowed: `npm run check:preflight`؛ `node -c backend/server.js backend/api/index.js`؛ `npm run check:db-source`؛ `npm run check:regression-safety`
- Commands forbidden: deploy؛ push؛ commit
- Exit criteria: همه gateها passed
- Smoke test: preflight output green
- Stop condition: هر gate قرمز → توقف و رفع
- Next step only if: preflight passed و مالک اجازه deploy داد (deploy خارج از این قدم است)

**STEP 9** — FIX / docs/governance
- Goal: رفع fragmentation (تصمیم nested `.git`؛ اصلاح refs اشتباه AGENTS.md: `Basteh.txt`→`retail-scenario-basteh.txt`, `fale.txt`→`wholesale-scenario-fale.txt`) — با تایید مالک
- Why now: blocker ۴
- Scope: فقط AGENTS.md (refs) + مستندات governance؛ دست‌نزدن به nested `.git` بدون تایید
- Files to read: `AGENTS.md`؛ `docs/retail-scenario-basteh.txt`؛ `docs/wholesale-scenario-fale.txt`
- Files to change: `AGENTS.md` (فقط اصلاح نام فایل در ارجاع) — با تایید مالک
- Commands allowed: edit AGENTS.md (تایید مالک)؛ git status
- Commands forbidden: push؛ اجرای migration؛ deploy؛ حذف nested `.git`
- Exit criteria: refs اصلاح شد؛ git status شفاف
- Smoke test: grep AGENTS.md برای نام‌های صحیح
- Stop condition: اگر مالک nested `.git` را تایید نکرد → دست‌نزن
- Next step only if: مالک تایید کرد و refs اصلاح شد

**STEP 10** — REPORT / docs/governance
- Goal: به‌روزرسانی `SERVICE_HEALTH_MATRIX.md` با وضعیت واقعی (فقط فایل موجود، با تایید مالک)
- Why now: پایان صف؛ ثبت وضعیت نهایی
- Scope: فقط `SERVICE_HEALTH_MATRIX.md` (موجود)
- Files to read: تمام گزارش‌های گام‌ها
- Files to change: `docs/SERVICE_HEALTH_MATRIX.md` (فقط به‌روزرسانی وضعیت) — با تایید مالک
- Commands allowed: edit فایل موجود
- Commands forbidden: فایل جدید؛ deploy؛ push
- Exit criteria: ماتریس با وضعیت واقعی به‌روز شد
- Smoke test: —
- Stop condition: —

### D) REQUIRED STEP TEMPLATES

**PRE-ACTION TEMPLATE** (قبل از هر اقدام — الزامی)
- Step number:
- Type: REPORT/FIX/TEST
- Target:
- Goal:
- Source of truth:
- Evidence:
- Scope:
- Files to read:
- Files to change:
- Commands to run:
- Commands explicitly forbidden:
- Risk:
- Stop condition:
- Expected output:
- Smoke test plan if applicable:

**POST-ACTION TEMPLATE** (بعد از هر اقدام — الزامی)
- Step number:
- Result:
- Evidence:
- Files changed:
- Commands run:
- Tests run:
- Pass/Fail:
- Errors:
- Git status:
- Secrets printed: no
- Deploy done: no/yes with owner approval
- Migration executed: no/yes with owner approval
- Next allowed step:

### E) FIRST LOCKED STEP (تنها قدم قابل اجرای فعلی)

**LOCKED STEP 1**
- Type: REPORT
- Target: backend
- Goal: ثبت evidence شکاف notifications (POST→۴۰۵ + نبود جدول/میگریشن)
- Why this is first: طبق قانون اولویت «Admin Panel endpoint را صدا می‌زند ولی backend handler [برای POST] ندارد → FIX اولویت»؛ مستقیماً قابل بازتولید (خط ۱۷۹۵ index.html → ۴۰۵ در notifications.js:32)
- Files to read: `backend/handlers/notifications.js`, `backend/api/index.js` (خط ۶۳), `backend/server.js` (خط ۸۸/۱۳۸), `admin-panel/index.html` (خط ۱۷۹۵), `supabase/*` (glob)
- Files to change: هیچ‌کدام
- Commands: grep/read/glob؛ `node -c backend/handlers/notifications.js`؛ بازخوانی خطوط
- Forbidden: edit/write/migration/deploy/git
- Expected evidence: `notifications.js` شاخه POST ندارد (فقط GET/PATCH، else ۴۰۵ در خط ۳۲)؛ route در هر دو entrypoint mount است (پس ۴۰۵ از سمت handler نه routing)؛ هیچ `supabase/*.sql` جدول `notifications` را نمی‌سازد
- Exit criteria: ۴۰۵ برای POST تأیید شد؛ نبود migration جدول `notifications` مستند شد
- If PASS, next step will be: STEP 2 (FIX / backend — پیاده‌سازی POST)
- If FAIL, stop and report: اگر مشخص شد handler اصلاً mount نشده یا POST پیاده‌شده → اولویت‌بندی تجدید می‌شود

### F) OUT OF SCOPE UNTIL UNLOCKED

تا پایان STEP 1 (و تا رسیدن به آن‌ها در صف) ممنوع است:
- messenger-app changes
- whatsapp changes
- UI redesign (admin-panel/wholesale)
- meeting UI
- performance UI
- deploy (بدون تایید مالک + preflight)
- migration execution (بدون plan + تایید مالک)
- git cleanup / commit / push / stage
- new documentation files
- refactor
- cosmetic changes
- تغییر فایل‌های legacy/generated (`bundle.min.js`, `modules/*`, `dashboard.html`, `*.bak`)
- دست‌زدن به nested `.git` (admin-panel)

### G) NO-CHANGE CONFIRMATION

- files changed: no
- files created: no
- files deleted: no
- staged: no
- committed: no
- pushed: no
- deployed: no
- migrations executed: no
- secrets printed: no

### H) STORAGE & ENFORCEMENT DECLARATION

**وضعیت تولید:** این Execution Lock در خروجی (read-only) تولید شد و اکنون در `docs/DEVELOPMENT_RULES.md` ذخیره شد (با تایید مالک).
**بعد از ذخیره:** هر اجرای بعدی در پروژه `F:\azarmehr-sanat-monorepo` ابتدا باید همین Execution Lock ذخیره‌شده را بخواند و طبق آن پیش رود؛ هر اقدام خارج از آن با **«OUT OF EXECUTION LOCK - NOT ALLOWED»** رد می‌شود.
**کار بعدی مجاز:** فقط `LOCKED STEP 1` (REPORT / backend / ثبت evidence شکاف notifications).
