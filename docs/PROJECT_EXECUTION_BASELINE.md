# PROJECT EXECUTION BASELINE

**Version:** 1.0  
**Status:** Active  
**Rule:** از این به بعد هر تصمیم، fix، migration، deploy و تست باید با این baseline تطبیق داده شود.

---

## ۱. Source Of Truth

منابع مرجع پروژه این‌ها هستند، با نقش‌های جدا:

| سند | نقش |
|-----|------|
| `PROJECT_MAP.md` | نقشه رسمی مونورپو، مسیرهای معتبر هر app/service، وضعیت routeها و source of truth کد |
| `DEVELOPMENT_RULES.md` | قانون اجرای کار، migration، deploy، evidence، preflight و smoke test |
| `PROJECT_TASK_EVIDENCE_AI_MVP_PLAN.md` | نقشه اجرایی MVP برای task، evidence، meeting، notifications و AI Assistant |
| `OMNICHANNEL_AI_AGENT_BLUEPRINT.md` | معماری کلان Omnichannel و AI Agent |
| `PROJECT_EXECUTION_BASELINE.md` | **(این سند)** قانون اولویت‌ها، فریز feature و ترتیب اجباری گام‌ها |
| گزارش‌های session/deploy/smoke test | evidence اجرایی برای اصلاح وضعیت مستندات |

### قاعده مهم

> اگر مستند قدیمی با evidence جدید تناقض داشت، evidence معتبرتر است؛ اما باید همان evidence سریعاً در مستندات رسمی sync شود.

---

## ۲. وضعیت واقعی فعلی پروژه

```
Architecture:       جلوتر از اجرا
Documentation:      زیاد، ولی نیازمند sync با واقعیت
Backend:            بخشی آماده، بخشی ناقص
Frontend/UI:        عقب‌تر از backend و دارای ghost routes
Database/RLS:       نیازمند audit و بستن gapها
Notifications:      resolved / verified
WhatsApp:           webhook پایه دارد، UI و abstraction ناقص است
AI Agent:           blueprint/foundational، نه محصول کامل
MVP:                در مرحله stabilization
```

**جمله مرجع:** پروژه در مرحله بین Design Complete و MVP Stabilization است. هدف فعلی: تثبیت MVP، نه اضافه‌کردن feature جدید.

---

## ۳. قانون فریز Feature

تا پایان Stabilization، feature جدید اضافه نمی‌شود مگر با approval صریح.

### ممنوع تا اطلاع بعدی

- feature جدید خارج از MVP
- UI جدید بدون backend contract
- endpoint جدید بدون test plan
- migration بدون plan و backup
- deploy بدون preflight و smoke test
- AI Agent automation جدید بدون audit/approval/grounding
- route تبلیغ‌شده بدون فایل مقصد واقعی

### مجاز

- رفع blockerهای MVP
- sync مستندات با evidence
- بستن RLS gaps
- حذف/اصلاح ghost routes
- contract alignment
- repo hygiene
- smoke test و preflight

---

## ۴. وضعیت Notifications

**وضعیت رسمی جدید:** `RESOLVED / VERIFIED`

### Evidence نهایی

```
Staging:
- POST /api/notifications -> 201
- GET /api/notifications -> 200

Production:
- public.notifications exists
- RLS enabled
- migration not needed
- initial POST -> 405 (production backend was outdated)
- backend redeployed from current backend/
- POST /api/notifications -> 201
- GET /api/notifications -> 200

No code changes.
No migration executed.
No schema touched.
Root cause: outdated production backend deployment.
```

### تصمیم

Notifications دیگر blocker فنی نیست. کار بعدی برای Notifications فقط sync مستندات و ثبت evidence است. نباید دوباره migration notifications اجرا شود مگر pre-check جدید خلافش را ثابت کند.

---

## ۵. ترتیب اجرای اجباری از اینجا به بعد

```
STEP 0: Sync Reality
STEP 1: RLS Gaps
STEP 2: Ghost Routes
STEP 3: Contract Alignment
STEP 4: Repo Hygiene
STEP 5: MVP Smoke Matrix
STEP 6: Omnichannel P1/P2
STEP 7: AI Copilot MVP
```

### STEP 0 — Sync Reality

**هدف:** مستندات با واقعیت فعلی یکی شوند.

**کارها:**
- وضعیت Notifications در `PROJECT_TASK_EVIDENCE_AI_MVP_PLAN.md` از blocker به resolved/verified تغییر کند
- ذکر شود migration اجرا نشده چون جدول وجود داشته
- ذکر شود production مشکل کد نداشته؛ مشکل deploy قدیمی بوده
- ثبت شود production redeploy فقط برای sync با کد staging-verified انجام شده
- هیچ کد یا migration جدیدی در این مرحله انجام نشود

**خروجی قابل قبول:** Documentation update only. Notifications status = verified. Evidence ثبت شده.

**Gate عبور:** هیچ تناقض باز درباره notifications در مستندات اصلی باقی نماند.

---

### STEP 1 — RLS Gaps

**هدف:** بستن شکاف‌های RLS قبل از توسعه بیشتر.

**جداول دارای gap:**
- `task_progress_updates`
- `task_blockers`
- `meeting_action_items`

**کارها:**
- بررسی وجود جدول‌ها
- بررسی RLS
- بررسی policyها
- ثبت دقیق gap
- طراحی migration plan
- گرفتن approval مالک قبل از اجرا
- اجرای migration فقط در staging
- smoke test
- سپس production با approval جدا

**قاعده:** هیچ policy روی production بدون staging verification اجرا نمی‌شود.

**خروجی قابل قبول:** RLS Gap Report, Migration Plan, Staging Verification, Production Approval Request.

---

### STEP 2 — Ghost Routes

**هدف:** routeهایی که در config تبلیغ شده‌اند ولی مقصد واقعی ندارند حذف یا واقعی شوند.

**موارد مهم:**
- WhatsApp admin UI routeها
- مسیرهای موجود در `vercel.json` که فایل مقصد ندارند
- routeهای admin-panel که 404 یا broken هستند

**تصمیم برای هر route فقط یکی از این دو است:**
- A) implementation واقعی ساخته شود
- B) route از config/UI حذف یا غیرفعال شود

**قاعده:** Route نمایشی بدون implementation ممنوع است.

**خروجی قابل قبول:** Ghost Route Inventory, Decision per route (implement/remove), Smoke test for remaining routes.

---

### STEP 3 — Contract Alignment

**هدف:** frontend/backend/database با هم یکی شوند.

**موارد known gap:**
- `active` field
- `role`/`system_role` mapping
- admin/user authorization expectations
- API response shape
- DB schema expectations

**کارها:**
- استخراج contract فعلی از backend
- تطبیق با DB schema
- تطبیق با frontend مصرف‌کننده
- ثبت breaking mismatchها
- fix کوچک و مرحله‌ای
- smoke test همان مسیر

**قاعده:** هیچ UI fix بدون contract check انجام نمی‌شود. هیچ backend fix بدون بررسی مصرف‌کننده UI انجام نمی‌شود.

**خروجی قابل قبول:** Contract Alignment Report, Fixed mismatches, Smoke test evidence.

---

### STEP 4 — Repo Hygiene

**هدف:** کاهش آشفتگی repo و جلوگیری از خطاهای مسیر/agent/context.

**موارد:**
- nested `.git`
- فایل‌های untracked مهم
- ارجاعات اشتباه در `AGENTS.md`
- مسیرهای قدیمی
- duplicate docs
- فایل‌های evidence پراکنده

**قاعده:** حذف یا جابه‌جایی فایل فقط با گزارش و approval.

**خروجی قابل قبول:** Repo Hygiene Report, Safe cleanup plan, Owner approval, Cleanup commit.

---

### STEP 5 — MVP Smoke Matrix

**هدف:** قبل از رفتن به Omnichannel/AI، MVP اصلی قابل اعتماد شود.

**مسیرهای اصلی smoke:**
- Auth/Login
- Admin dashboard
- Projects
- Tasks
- Evidence
- Meetings
- Notifications
- Reports/users/performance

**برای هر مسیر:** GET/POST اصلی، auth behavior، RBAC behavior، DB/RLS behavior، UI behavior if exists.

**خروجی قابل قبول:** MVP Smoke Matrix, PASS/FAIL per module, Known blockers, Next fix order.

---

### STEP 6 — Omnichannel P1/P2

فقط بعد از تثبیت MVP شروع می‌شود.

**هدف P1:** کشف وضعیت واقعی routeها، webhookها، adapterها، storage، auth و UI

**هدف P2:** طراحی domain/data model برای channel, conversation, message, participant, assignment

**ممنوع:** AI automation، multi-channel send، agent action، campaign automation تا وقتی domain و audit مشخص نشده‌اند.

---

### STEP 7 — AI Copilot MVP

AI Agent کامل هنوز شروع نمی‌شود. اول فقط Copilot کنترل‌شده.

**حداقل نیازها:**
- knowledge policy
- source citation
- draft storage
- approval flow
- audit log
- human-in-the-loop
- no autonomous external send

**قاعده:** AI پیشنهاد می‌دهد؛ انسان تأیید می‌کند. AI بدون audit و approval عملیاتی نمی‌شود.

---

## ۶. قانون Migration

برای هر migration:

```
1. Evidence
2. Migration Plan
3. Backup/Rollback note
4. Owner approval
5. Staging execution
6. Staging DB verification
7. Staging smoke test
8. Production approval جدا
9. Production pre-check
10. Conditional execution
11. Production smoke test
12. Report
```

**ممنوع:**
- اجرای migration مستقیم روی production
- اجرای migration وقتی جدول/ستون از قبل وجود دارد
- اجرای migration بدون pre-check
- اجرای migration برای حل مشکل deploy

---

## ۷. قانون Deploy

Deploy فقط وقتی مجاز است که:

```
- preflight pass شده باشد
- scope مشخص باشد
- کد target مشخص باشد
- env target مشخص باشد
- smoke test تعریف شده باشد
- rollback point مشخص باشد
```

برای redeploy بدون تغییر کد، مثل اتفاق Notifications:

> Redeploy مجاز است اگر هدف فقط sync production با کد staging-verified باشد. اما باید evidence و commit/deployment ثبت شود.

---

## ۸. اولویت فعلی

```
Priority 0: ثبت و sync وضعیت Notifications
Priority 1: RLS gaps
Priority 2: Ghost routes
Priority 3: Contract alignment
Priority 4: Repo hygiene
Priority 5: MVP smoke matrix
Priority 6: Omnichannel P1/P2
Priority 7: AI Copilot MVP
```

پس گام بعدی نباید feature جدید باشد.

**گام بعدی دقیق:** STEP 0 را انجام بده: مستندات را با وضعیت واقعی Notifications sync کن و آن را از blocker به verified تغییر بده.

---

## ۹. متن تصمیم نهایی برای Agent

```
PROJECT EXECUTION DIRECTIVE

We are freezing new feature development and entering MVP Stabilization.

Use the following source hierarchy:
1. PROJECT_MAP.md for monorepo map and source paths.
2. DEVELOPMENT_RULES.md for execution gates.
3. PROJECT_TASK_EVIDENCE_AI_MVP_PLAN.md for MVP scope.
4. OMNICHANNEL_AI_AGENT_BLUEPRINT.md for long-term architecture only.
5. Latest verified smoke-test reports as execution evidence.

Current verified reality:
- Notifications are resolved and verified in staging and production.
- Staging POST /api/notifications returned 201 and GET returned 200.
- Production notifications table exists and RLS is enabled.
- No notifications migration was executed because the table already existed.
- Production POST initially returned 405 due to an outdated backend deployment.
- Redeploying current backend/ fixed production POST to 201.
- Production GET returns 200.
- No code changes, schema changes, or migrations were performed.

Immediate task:
Update project documentation to reflect this verified reality.
Do not change code.
Do not run migrations.
Do not deploy.
Do not open new feature work.

After documentation sync, proceed in this order:
1. RLS gaps for task_progress_updates, task_blockers, meeting_action_items.
2. Ghost routes cleanup, especially WhatsApp/admin-panel routes.
3. Contract alignment for active and role/system_role.
4. Repo hygiene.
5. MVP smoke matrix.
6. Omnichannel P1/P2.
7. AI Copilot MVP.

Hard rules:
- No migration without plan, backup note, staging verification, and owner approval.
- No production migration without separate production approval.
- No deploy without preflight, smoke test, and rollback point.
- No AI automation without audit, approval, and knowledge grounding.
- No route may be advertised unless it has a real destination.
- If documentation conflicts with verified evidence, update documentation before continuing.
```

---

## جمع‌بندی اجرایی

از این به بعد جواب «الان چی کار کنیم؟» این است:

```
اول sync مستندات با واقعیت.
بعد RLS gaps.
بعد ghost routes.
بعد contract alignment.
بعد repo hygiene.
بعد MVP smoke matrix.
بعد تازه Omnichannel و AI.
```

و وضعیت Notifications:

```
Done. Verified. فقط مستندسازی‌اش باقی مانده.
```
