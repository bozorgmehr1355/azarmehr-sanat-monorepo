# Plan: ایجاد Supabase Staging Project مجزا برای whatsapp-broadcast-api

> **وضعیت:** فقط **طرح (plan)** — هیچ اقدامی اجرا نشده است.
> **محیط:** این سند صرفاً برای آماده‌سازی یک staging Supabase project جداگانه است.
> **Production دست‌نخورده می‌ماند.**
> **هیچ SQL، هیچ migration، هیچ deploy، هیچ تغییر env در این مرحله اجرا نمی‌شود.**

---

## 1. هدف و محدوده

**هدف:** ایجاد یک Supabase project کاملاً مستقل و جداگانه برای `whatsapp-broadcast-api` که
به‌عنوان محیط staging عمل کند. این project با production Supabase فعلی هیچ اشتراکی در
داده، schema، کلید یا پیکربندی نخواهد داشت.

**محدوده:**
- ✅ این سند فقط **plan** است — هیچ اقدامی اجرا نمی‌شود.
- ✅ پروژه production فعلی دست‌نخورده می‌ماند.
- ❌ اجرای این plan نیازمند **approval جداگانه مالک** است.
- ❌ migration ستون `whatsapp_inbox.customer_id` در این مرحله اجرا نمی‌شود.
- ❌ PATCH handler در این مرحله پیاده‌سازی نمی‌شود.
- ❌ هیچ Vercel env variable در این مرحله تغییر نمی‌کند.
- ❌ هیچ deploy ای در این مرحله انجام نمی‌شود.

---

## 2. وضعیت فعلی و دلیل نیاز

**شواهد موجود:**

1. Vercel production و preview (development) از **یک Supabase project مشترک** استفاده می‌کنند.
   - فایل `backend/.env` (واقعی) حاوی `SUPABASE_URL` متعلق به همان پروژه است.
   - فایل‌های `.env.vercel-*` (placeholder) دارای مقادیر خالی هستند و فقط در Vercel runtime پر می‌شوند.
   - فایل `supabase/schema.sql` در کامنت خود همان پروژه production را نشان می‌دهد.
2. هیچ `config.toml`، `seed.sql` یا `.branches` در پوشه `supabase/` وجود ندارد ←
   راه‌اندازی Supabase CLI / local staging وجود ندارد.
3. **staging database مستقل قابل اثبات نیست** — به همین دلیل migration قبلی
   (`whatsapp_inbox.customer_id`) متوقف شده است (علت: محیط staging مجزا وجود ندارد).

**دلیل نیاز:**
- بدون staging مستقل، هر تغییری در schema مستقیماً روی production اثر می‌گذارد.
- تست migration، endpoint جدید، و PATCH handler بدون staging safe room امکان‌پذیر نیست.
- خطاهای احتمالی در schema (مثل نوع اشتباه، نام ستون، migration شکست‌خورده) مستقیماً
  سرویس production را از دسترس خارج می‌کند.

---

## 3. معماری هدف

```
┌──────────────────────────┐     ┌──────────────────────────────┐
│  Production Vercel       │     │  Staging / Preview Vercel   │
│  whatsapp-broadcast-api  │     │  whatsapp-broadcast-api     │
│  (vercel --prod)         │     │  (preview deploy)           │
└──────────┬───────────────┘     └──────────┬───────────────────┘
           │                                │
           ▼                                ▼
┌──────────────────────────┐     ┌──────────────────────────────┐
│  Production Supabase     │     │  Staging Supabase (جداگانه) │
│  (project فعلی)          │     │  ✦ Project Ref متفاوت       │
│  ✦ SUPABASE_URL تولیدی   │     │  ✦ SUPABASE_URL مخصوص       │
│  ✦ SERVICE_ROLE_KEY تولیدی│    │  ✦ SERVICE_ROLE_KEY مخصوص   │
│  ✦ داده‌های واقعی        │     │  ✦ داده‌های مصنوعی/تستی     │
└──────────────────────────┘     └──────────────────────────────┘

┌──────────────────────────┐
│  Local Development       │
│  ← فقط env staging/local │
│  ← هرگز production env   │
└──────────────────────────┘
```

**قوانین معماری جداسازی:**

| مؤلفه | Production | Staging |
|-------|-----------|---------|
| Project Ref | متفاوت (موجود) | متفاوت (جدید) |
| SUPABASE_URL | متعلق به production | متعلق به staging |
| SUPABASE_SERVICE_ROLE_KEY | متعلق به production | متعلق به staging |
| داده | واقعی (تولید) | مصنوعی یا masked |
| RLS | فعال مطابق production | هم‌راستا با production |
| Webhook UltraMsg | endpoint واقعی | mock / sandbox |

**نکات امنیتی:**
- `service-role key` هرگز وارد client/browser نشود (در هیچ محیطی).
- runtime همچنان فقط از `@supabase/supabase-js` (Supabase JS Client) استفاده می‌کند —
  حتی در staging.
- `POSTGRES_URL` (اتصال مستقیم PostgreSQL) فقط برای migration/debug کنترل‌شده مجاز
  است و نباید runtime source of truth شود (طبق `docs/DATABASE_SOURCE_OF_TRUTH.md`).

---

## 4. پیش‌نیازهای مالک (قدم‌به‌قدم، برای غیر‌برنامه‌نویس)

> ⚠️ **هیچ‌کدام از این مراحل را در این مرحله اجرا نکن.** این فقط راهنمای قدم‌های آینده
> پس از approval است.

### قدم ۱: ورود به Supabase Dashboard
1. مرورگر را باز کنید و به `https://supabase.com/dashboard` بروید.
2. با حساب کاربری که دسترسی organization `ams-group` دارد وارد شوید
   (organization مشابه تولید — وگرنه مالک organization صحیح را تعیین کند).

### قدم ۲: ایجاد New Project
1. دکمه **"New Project"** را در بالای صفحه Dashboard بزنید.
2. Organization: **همان organization پروژه فعلی** (یا organization مشخص‌شده).

### قدم ۳: تنظیمات پروژه جدید
- **Name:** `azarmehr-whatsapp-staging` (یا نام مشابه واضح)
- **Database Region:** **همان Region پروژه تولید** (برای کاهش اختلافات environment).
  اگر region فعلی مثلاً `EU West` یا `Singapore` است، همان را انتخاب کنید.
- **Database Password:** یک رمز عبور قوی و جدید (کاملاً متفاوت از production) ایجاد کنید.
  این رمز را در یک password manager (مثل 1Password یا Bitwarden) ذخیره کنید.
  این رمز برای اتصال مستقیم PostgreSQL استفاده می‌شود — در runtime استفاده نمی‌شود.

### قدم ۴: پس از ایجاد پروژه
1. Project به‌طور خودکار provisioning می‌شود (چند دقیقه).
2. پس از آماده‌شدن، صفحه **Project Settings** را باز کنید.
3. بخش **Project API Keys / Project Configuration** را باز کنید.
4. اطلاعات زیر را یادداشت کنید (بدون اشتراک‌گذاری عمومی):

| چه چیزی | کجا پیدا می‌شود | حساسیت |
|---------|-----------------|--------|
| **Project Ref** (شناسه پروژه) | Setting > General > Reference | LOW (غیرحساس) |
| **Region** | Setting > General > Region | LOW |
| **Supabase URL** | Setting > API > URL | MEDIUM (قابل مشاهده عمومی در کلاینت) |
| **anon public key** | Setting > API > anon public | MEDIUM (کلاینت ساید) |
| **service_role key** | Setting > API > service_role (مخفی) | 🔴 **SECRET - هرگز公開 نشود** |
| **Database password** | در قدم ۳ خودتان ساختید | 🔴 **SECRET** |

### قدم ۵: تنظیمات امنیتی اولیه
- در Setting > API، **API Settings را باز بگذارید** (فعال بودن API).
- در Setting > Database، **SSL enforcement** را فعال کنید (پیش‌فرض معمولاً فعال است).
- هیچ integration (Vercel, Auth, etc.) را در این مرحله وصل نکنید.

### قدم ۶: پس از ساخت

بعد از ساخت پروژه، فقط این اطلاعات **غیرحساس** را به تیم فنی گزارش دهید:

- **نام staging project:** azarmehr-whatsapp-staging (یا نام انتخابی)
- **تأیید متفاوت بودن Project Ref** (مثلاً «Project Ref با production تفاوت دارد»)
- **Region:** مثلاً EU West یا Singapore
- **زمان ساخت:** تاریخ و ساعت
- **تأیید ذخیره امن database password**
- **تأیید اینکه هیچ production integration متصل نشده**
- **تأیید اینکه هیچ داده واقعی کپی نشده**

این موارد را **هرگز** در چت یا گزارش عمومی ارسال نکنید:
- ❌ service-role key
- ❌ anon key (اگر کانال عمومی است)
- ❌ database password
- ❌ connection string
- ❌ access token
- ❌ Vercel OIDC token

---

## 5. جداسازی اطلاعات و سرویس‌های بیرونی

پس از ایجاد staging project، این قوانین جداسازی باید رعایت شوند:

### UltraMsg (واتساپ)
- **Endpoint تولیدی** (`ULTRAMSG_TOKEN` / `ULTRAMSG_INSTANCE` production) **نباید** webhook
  staging را صدا بزند.
- webhook URL در UltraMsg dashboard باید فقط به production Vercel اشاره کند، نه staging.
- staging نباید پیام واقعی WhatsApp ارسال کند — `sendWhatsAppMessage` باید در staging
  غیرفعال یا mocked باشد.

### داده‌های واقعی
- شماره مشتری واقعی و متن پیام واقعی نباید بدون masking وارد staging شود.
- اگر برای تست نیاز به داده شبیه‌سازی‌شده هست، از داده **مصنوعی** استفاده کنید:
  شماره‌های test مثل `09120000000`، `09120000001` و غیره.
- **حتی یک ردیف** از داده‌های real customer نباید مستقیماً از production export/import شود.

### Side Effects (عوارض جانبی)
- cron، webhook، trigger یا integration تولیدی نباید خودکار در staging فعال شود.
- email/SMS/WhatsApp side effect باید در staging **پیش‌فرض غیرفعال** باشد.
- اگر بعداً نیاز به تست outbound WhatsApp شد، باید از یک sandbox/test instance جداگانه
  یا mock استفاده شود.

---

## 6. ساخت schema در staging

> ⚠️ این بخش فقط **برنامه** است. هیچ دستوری را اجرا نکنید.

**ترتیب پیشنهادی (پس از approval جداگانه):**

1. **Inventory فایل‌های schema/migration موجود:**
   تمام فایل‌های `supabase/*.sql` موجود در ریپو را بر اساس `docs/DB_MIGRATION_READINESS.md`
   فهرست کنید و مشخص کنید کدام اجرا شده و کدام نه.

2. **تشخیص source of truth واقعی schema:**
   برای جداول حیاتی (مثل `whatsapp_inbox` که در ریپو CREATE TABLE ندارد) باید
   schema فعلی production مستند شود، اما **execution روی staging** انجام شود.

3. **تفکیک baseline snapshot از executable migration:**
   - `supabase/crm-production-baseline.sql` طبق `docs/PROJECT_MAP.md` یک **snapshot read-only**
     از schema production است، **نه migration**. نباید بدون review به‌عنوان migration اجرا شود.
   - فقط فایل‌های idempotent (`IF NOT EXISTS` / `DO block`) برای staging اولویت دارند.
   - فایل‌های حاوی `DROP` / `TRUNCATE` / `DELETE` و `ALTER`های destructive نیازمند
     STOP و approval جدا هستند.

4. **بررسی دستی SQLهای خطرناک:**
   هر فایل SQL قبل از اجرا روی staging باید review شود.

5. **ایجاد backup اولیه staging:**
   بلافاصله پس از provisioning، یک snapshot/dump از staging خالی بگیرید.
   این snapshot نقطه بازگشت اولیه خواهد بود.

6. **اعمال schema فقط روی staging:**
   فقط فایل‌های تأییدشده اجرا شوند.

7. **اجرای verification query‌ها:**
   طبق الگوی `docs/DB_MIGRATION_READINESS.md`.

8. **اجرای seed داده مصنوعی و غیرحساس:**
   برای تست webhook و inbox.

9. **ثبت evidence:**
   هر مرحله مستند شود.

**هشدارهای مهم:**
- `supabase/crm-production-baseline.sql` نباید بدون review به‌عنوان migration اجرا شود.
- هیچ schema یا داده‌ای از production در این مرحله export/import نمی‌شود.
- `DROP TABLE`های مخرب (طبق جدول DB_MIGRATION_READINESS) فقط در staging مجازند و نیازمند
  تأیید هستند.

---

## 7. متغیرهای محیطی Vercel

> ⚠️ این بخش فقط **طرح آینده** است. هیچ تغییری در Vercel env variables در این مرحله
> انجام ندهید. هیچ محیط staging یا preview در Vercel نباید با env production اشتباه گرفته شود.

### ماتریس پیشنهادی (پس از approval جداگانه)

| متغیر | Production | Preview (Staging) | Development (Local) |
|-------|-----------|-------------------|---------------------|
| `SUPABASE_URL` | بدون تغییر / production | ← بعد از approval، متصل به staging Supabase | staging یا local |
| `SUPABASE_SERVICE_ROLE_KEY` | بدون تغییر / production | ← بعد از approval، متصل به staging Supabase | staging یا local |
| `ULTRAMSG_TOKEN` | production | production (اختیاری — ترجیحاً mock) | mock/test |
| `ULTRAMSG_INSTANCE` | production | test instance یا خالی | test instance یا خالی |

### قوانین:
- 🔴 **secret‌ها نباید داخل repository ذخیره شوند.** فایل‌های `.env` همیشه gitignored.
- 🔴 مقدار env در log یا report **چاپ نشود** — فقط می‌توان گفت `SECRET_PRESENT`.
- ✅ قبل از هر تغییر Vercel env، **project scope** (whatsapp-broadcast-api) و
  **environment scope** (Preview vs Production) باید دوباره تأیید شوند.
- ✅ تغییر env و redeploy در این plan **اجرا نمی‌شوند** و approval جدا می‌خواهند.
- Development (محلی): اگر developer نیاز به Supabase دارد، اولویت با staging env است.
  هرگز production را به‌عنوان پیش‌فرض local development قرار ندهید.

---

## 8. گیت تشخیص staging (معیار قطعی جداسازی)

پس از ایجاد staging project و تنظیم envها، همهٔ معیارهای زیر باید **همگی PASS** شوند.
اگر هرکدام FAIL بود → **STOP_NO_PROVEN_STAGING_ISOLATION** و هیچ migration/تغییر دیگری
اجرا نشود.

### معیارهای PASS:

| # | معیار | روش تأیید |
|---|-------|-----------|
| ۱ | Project Ref staging با production متفاوت است | مقایسه Setting > General > Reference دو پروژه |
| ۲ | hostname Supabase staging با production متفاوت است | SUPABASE_URL دو پروژه شروع متفاوت دارند |
| ۳ | یک marker غیرحساس مثل `environment_name=staging` قابل بازیابی است | ایجاد یک ردیف در جدول موقت یا comment |
| ۴ | جدول‌ها و داده‌های staging مستقل هستند | production هنگام کار با staging تغییر نمی‌کند |
| ۵ | نوشتن یک test row در staging هیچ اثری روی production ندارد | test row با داده مصنوعی write شود، سپس production چک شود تغییری نکرده |
| ۶ | test row با داده مصنوعی ایجاد و سپس حذف می‌شود | ردیف موقت بعد از تأیید پاک شود |
| ۷ | production در تمام این آزمایش‌ها read-only و ترجیحاً بدون اتصال است | در طول تأیید staging، از هرگونه اتصال به production خودداری شود |

**اگر هرکدام قابل تأیید نبود:**
```
STOP_NO_PROVEN_STAGING_ISOLATION
```

---

## 9. Backup و rollback

### قبل از هر schema migration روی staging:
- ✅ **Snapshot / backup staging** گرفته شود و وجودش تأیید شود.
- ✅ روش restore از snapshot مستند شود.

### rollback برای ADD COLUMN nullable:
```sql
alter table public.whatsapp_inbox drop column if exists customer_id;
```

### قوانین rollback:
- rollback فقط در صورتی اجرا شود که هیچ داده وابسته ایجاد نشده باشد (مثلاً اگر PATCH
  handler قبلاً روی staging کار کرده و ردیف‌هایی مقدار `customer_id` گرفته‌اند،
  DROP COLUMN ممکن است داده را از بین ببرد).
- اگر داده یا dependency ایجاد شده باشد، DROP COLUMN خودکار **ممنوع** است و نیازمند
  review جداگانه می‌باشد.
- **Production rollback** در این سند موضوعیت ندارد چون production نباید تغییر کند.

---

## 10. برنامه انتقال customer_id

> ⚠️ این بخش فقط بعد از اثبات staging isolation (بخش ۸) و با approval جداگانه مجاز است.

### Precheck (بررسی پیش از migration):
1. وجود جدول `public.whatsapp_inbox` در staging.
2. نبود یا وضعیت فعلی ستون `customer_id`.
3. شناسایی قطعی جدول مرجع مشتری (احتمالاً `crm_customers`).
4. شناسایی نوع دقیق primary key مشتری (مثلاً `bigint`).
5. اگر نوع یا جدول مرجع نامطمئن بود → STOP.

### Migration آینده (روی staging فقط):
- فقط `ADD COLUMN IF NOT EXISTS customer_id <CONFIRMED_TYPE> nullable`.
- **بدون FK** در مرحله اول (برای جلوگیری از lock).
- **بدون index** در مرحله اول (مگر evidence نیاز را ثابت کند).
- **بدون backfill** در مرحله اول.

> نمونه SQL (صرفاً مثال — اجرا نشود):
```sql
-- EXAMPLE_ONLY_DO_NOT_RUN
-- alter table public.whatsapp_inbox
--   add column if not exists customer_id bigint;
```

### Postcheck:
- وجود ستون `customer_id`.
- تأیید نوع ستون مطابق با نوع id مشتری.
- تأیید `is_nullable = YES`.
- `SELECT id, sender_phone, message_body, created_at, customer_id FROM public.whatsapp_inbox LIMIT 5;`
- اثبات عدم تغییر production (جدول و داده‌های production تغییر نکرده).

---

## 11. Smoke test آینده whatsapp-broadcast-api

> پس از راه‌اندازی staging و قبل از هر deploy، smoke plan زیر فقط روی staging تعریف شود.

### Smoke plan (staging only):

| تست | هدف | معیار PASS |
|-----|-----|-----------|
| Health check | سرویس اجرا می‌شود | `GET /api/webhook` → 200 |
| Webhook با payload مصنوعی | دریافت پیام در staging | ارسال payload ساختگی، تأیید درج در whatsapp_inbox |
| **عدم** ارسال WhatsApp واقعی | هیچ side effect به UltraMsg | `sendWhatsAppMessage` غیرفعال/mock |
| تأیید write در Supabase staging | داده در staging نوشته می‌شود | ردیف جدید در جدول staging |
| تأیید **عدم** write در production | production untouched | چک شود production تغییری نداشته |
| تست read/write ستون customer_id | (پس از migration) | `UPDATE ... SET customer_id = X` کار کند |
| PATCH endpoint | (پس از پیاده‌سازی جداگانه) | فقط با approval جدا تست شود |

### قوانین smoke:
- هیچ secret در گزارش smoke چاپ نشود.
- smoke با داده‌های مصنوعی انجام شود.
- اگر smoke نیاز به endpoint دارد که پیاده‌سازی نشده، وضعیت UNKNOWN ثبت شود.

---

## 12. مراحل approval

هر approval **مستقل** است و approval قبلی، approval بعدی را مجاز نمی‌کند.

| کد | مرحله | توضیح |
|----|-------|-------|
| **A** | ایجاد Supabase staging project | ایجاد پروژه جدید در Dashboard |
| **B** | اعمال schema روی staging | اجرای فایل‌های schema/migration تأییدشده روی staging |
| **C** | تنظیم Vercel Preview env برای staging | تغییر SUPABASE_URL و KEY در Preview Environment |
| **D** | Deploy به Preview | Vercel deploy برای تست staging |
| **E** | Migration ستون customer_id روی staging | ADD COLUMN روی staging |
| **F** | پیاده‌سازی PATCH handler | کدنویسی و test روی staging |
| **G** | هرگونه production migration یا deploy | دست زدن به production |

**تأکید:** Approval A هیچ‌کدام از B تا G را خودکار مجاز نمی‌کند.
هر مرحله نیازمند approval مستقل و عبور از pre-gateهای مربوطه است.

---

## 13. چک‌لیست اجرای مالک (قدم‌به‌قدم، غیرتلگرافی)

این چک‌لیست برای زمانی است که **approval مرحله A (ایجاد پروژه) صادر شود**.

### ☐ قدم ۱ — ورود به Supabase Dashboard
1. به `https://supabase.com/dashboard` بروید.
2. با حساب کاربری organization `ams-group` (یا organization ای که production در آن است) وارد شوید.
3. اگر چند organization دارید، مطمئن شوید درست انتخاب کرده‌اید (همان organization پروژه production).

### ☐ قدم ۲ — ایجاد پروژه جدید
1. دکمه **"New Project"** را بزنید.
2. Organization: همان organization production.
3. Name: `azarmehr-whatsapp-staging` (یا نام واضح دیگر).

### ☐ قدم ۳ — تنظیمات پروژه
1. **Database Region:** دقیقاً همان Region پروژه production.
2. **Database Password:** یک رمز جدید و قوی ایجاد کنید — **کاملاً متفاوت از production**.
   - می‌توانید از تولیدکننده رمز خود Supabase استفاده کنید.
   - این رمز را بلافاصله در یک Password Manager (1Password، Bitwarden، یا مشابه) ذخیره کنید.
   - **این رمز را در هیچ چت، ایمیل یا تیکتی ارسال نکنید.**

### ☐ قدم ۴ — منتظر provisioning بمانید
- چند دقیقه طول می‌کشد. بعد از آماده‌شدن پروژه، صفحه باز می‌شود.

### ☐ قدم ۵ — تأیید و ثبت اطلاعات غیرحساس
1. به **Project Settings > General** بروید.
2. **Project Ref** را ببینید. تأیید کنید با production تفاوت دارد.
3. **Region** را یادداشت کنید.
4. به تیم فنی فقط این موارد را گزارش دهید:
   - نام پروژه
   - Project Ref (عدد/حروف) — تأیید متفاوت بودن
   - Region
   - زمان ساخت

### ☐ قدم ۶ — تأیید عدم اتصال به production
- در Setting > Integrations، بررسی کنید هیچ integration به Vercel یا سرویس دیگر متصل نیست.
- در Authentication > Settings (اگر تولید از第三方 auth استفاده می‌کند) چیزی را تغییر ندهید.

### ☐ قدم ۷ — ریپورت نهایی به تیم فنی
اطلاعات غیرحساس زیر را در یک کانال امن (نه عمومی) به تیم فنی بدهید:
- نام staging project
- Project Ref (بدون key)
- Region
- تأیید ذخیره امن database password
- تأیید عدم اتصال production integration
- تأیید عدم کپی داده واقعی

**ارسال نکنید:**
- ❌ service-role key
- ❌ anon public key (در کانال عمومی)
- ❌ database password
- ❌ connection string
- ❌ access token
- ❌ Vercel OIDC token

---

## 14. معیار پایان plan

این plan زمانی PASS محسوب می‌شود که همهٔ موارد زیر برقرار باشند:

- [✅] فایل plan کامل است (همه ۱۴ بخش)。
- [✅] هیچ production change انجام نشده است.
- [✅] هیچ secret در فایل plan ثبت نشده است.
- [✅] هیچ SQL اجرا نشده است.
- [✅] هیچ env تغییری نکرده است.
- [✅] هیچ deploy انجام نشده است.
- [✅] تنها فایل تغییرکرده همین فایل plan است.

**Production remains unchanged.**
**No SQL executed.**
**No deploy performed.**
**Separate approval required.**
**STOP_NO_PROVEN_STAGING_ISOLATION.**

---

> ⚠️ **یادداشت نهایی:** این سند فقط یک plan است. هیچ اقدامی در آن اجرا نشده است.
> تولید دست‌نخورده باقی می‌ماند. برای هر مرحله بعدی، approval جداگانه و مستند required است.
