# Service Health Matrix

> آخرین به‌روزرسانی: ۲۰ تیر ۱۴۰۴ — ممیزی read-only
>
> اگر سرویسی قابل تست نیست (dependencies missing, env unavailable) → وضعیت UNKNOWN است، نه OK.

---

## Matrix

| سرویس | وضعیت | آخرین دستور تأیید | متغیرهای محیطی الزامی | وابسته به | دستور smoke امن | شکاف‌های شناخته‌شده | تأیید بعدی الزامی |
|-------|--------|---------------------|------------------------|-----------|-----------------|---------------------|-------------------|
| **Backend API** (deployed) | ✅ OK | `GET /api/health` → 200, 38 route | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET | Supabase | `node -c server.js` + `node -c handlers/*.js` | — | قبل از هر deploy |
| **Backend API** (local) | ✅ OK | `node -c` روی ۴۲ فایل, require همه deps | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET | node_modules نصب | `npm run dev` (نیاز به .env) | test=echo, build=ندارد | بعد از هر تغییر در handlers/ |
| **WhatsApp API** (deployed) | ⚠️ جزئی | `GET /api/webhook` → 200, version 2026-07-11-1 | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN | Supabase | `GET /api/webhook` | `GET /api/health` → 404 (health.js مفقود) | قبل از هر deploy |
| **WhatsApp API** (local) | ⚠️ UNKNOWN | `node -c` روی ۶ فایل ✅ | (همان deployed) | بدون node_modules قابل اجرا نیست | نیاز به `npm install` | node_modules نصب نیست, health.js مفقود | بعد از نصب dependencies |
| **Wholesale Portal** (deployed) | ⚠️ جزئی | صفحه لود شد ولی "Loading..." | VITE_API_BASE, WHATSAPP_API_BASE | Backend API, WhatsApp API | `npx serve .` (local) | داده‌ها لود نمی‌شوند (API/Supabase issue), ۱۸ فایل حذف محلی | بعد از رفع فایل‌های حذف‌شده |
| **Wholesale Portal** (local) | ❌ BROKEN | git status: ۱۸ فایل D | — | — | — | ۱۸ فایل ردیابی‌شده از دیسک حذف شده | بازگردانی با `git checkout -- .` |
| **Admin Panel** (deployed) | ❌ FAIL | `GET https://azarmehr-admin.vercel.app/` → 404 | (hardcoded در index.html) | Backend API, Supabase | — | مستقر نیست, ۵ فایل حذف محلی | یافتن URL صحیح یا استقرار مجدد |
| **Admin Panel** (local) | ❌ BROKEN | git status: ۵ فایل D | — | — | — | README, dashboard.html, deploy workflow, NotificationContext حذف شده | بازگردانی با `git checkout -- .` |
| **Messenger App** (deployed) | ❌ FAIL | `GET https://messenger-app.vercel.app/` → empty | (hardcoded در index.html) | Backend API, Supabase | — | مستقر نیست | استقرار مجدد |
| **Messenger App** (local) | 🔴 BROKEN | git status: ۱۴ ماژول core + ۴ فایل D | — | — | — | **همه ماژول‌های core حذف شده** (CRM, Chat, Letters, Notifications, OrgChart, Payments, Projects, Requests, Admin) | بازگردانی فوری با `git checkout -- .` |
| **DB Source-of-Truth Gate** | ✅ OK | 49/49 قبول | — | — | `node scripts/check-db-source-of-truth.js` | — | قبل از هر commit/deploy |
| **Regression Safety Gate** | ✅ OK | جاری — first run | — | — | `node scripts/check-regression-safety.js` | — | قبل از هر commit/deploy |

---

## تفسیر وضعیت‌ها

| وضعیت | معنی |
|-------|-------|
| ✅ OK | سالم و قابل اجرا |
| ⚠️ جزئی | در دسترس است ولی مشکل جزئی دارد |
| ⚠️ UNKNOWN | قابل تست نیست (بدون dependencies, بدون env) |
| ❌ FAIL | در دسترس نیست (404, empty page) |
| ❌ BROKEN | کد وجود دارد ولی فایل‌های ضروری حذف شده |
| 🔴 BROKEN | بحرانی — نیاز به اقدام فوری |

---

## اولویت رفع

```
1. messenger-app: git checkout -- .        (بازگردانی ۱۴ ماژول core)
2. whatsapp-broadcast-api: ایجاد health.js
3. admin-panel: git checkout -- .          (بازگردانی ۵ فایل)
4. wholesale-portal: git checkout -- .     (بازگردانی ۱۸ فایل)
5. messenger-app: استقرار در Vercel
6. admin-panel: استقرار در Vercel
7. wholesale-portal: بررسی API connectivity (رفع "Loading...")
```
