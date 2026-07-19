# Migration Plan: whatsapp_inbox.customer_id - Staging Only

> وضعیت: فقط **طرح (plan)** — هیچ SQL اجرا نشده، هیچ migration اجرا نشده.
> محیط هدف: **فقط staging**. Production **صراحتاً خارج از scope** است.
> تهیه‌کننده: PawWork — فقط read-only، بدون اجرا.

---

## 1. Target

- **target_app:** whatsapp-broadcast-api/
- **database_table:** public.whatsapp_inbox
- **target_column:** customer_id
- **environment_scope:** staging only
- **production_scope:** explicitly excluded

---

## 2. Reason (دلیل)

پنل ادمین (`admin-panel/index.html`) یک قابلیت «اتصال دستی پیام inbox به مشتری» دارد که در
تابع `WhatsAppInbox.handleManualLink` (خط ۶۵۲۸‑۶۵۴۰) پیاده شده و در خط ۶۵۳۲ فراخوانی می‌کند:

```js
const res = await api("PATCH", `whatsapp-inbox/${linkRow.id}`, { customer_id: customer.id }, BROADCAST_API);
```

یعنی UI انتظار دارد endpoint `PATCH /api/whatsapp-inbox/:id` فیلد `customer_id` را روی جدول
`whatsapp_inbox` بنویسد. اما بررسی‌های read-only نشان می‌دهد جدول واقعی `whatsapp_inbox`
طبق evidence فعلی **ستون `customer_id` ندارد**. پس قبل از اینکه handler پیشنهادی PATCH در
`whatsapp-broadcast-api/api/whatsapp_inbox.js` پیاده‌سازی و deploy شود، ابتدا باید ستون در
**staging** اضافه شده و وجودش تأیید گردد؛ در غیر این صورت PATCH در runtime با خطای
«column customer_id does not exist» شکست می‌خورد.

این طرح فقط مرحلهٔ آماده‌سازی schema در staging را پوشش می‌دهد؛ پیاده‌سازی handler و deploy در
تسک جداگانه (با approval جداگانه) انجام می‌شود.

---

## 3. Current Evidence (شواهد فعلی)

- فایل پشتیبان production / pre-CRM-RLS (`_manual_backups/.../ams-app-production-pre-crm-rls-20260716-145509.dump`)
  در دستور `COPY public.whatsapp_inbox` فقط این ستون‌ها را نشان داد:

  ```
  id, sender_phone, message_body, raw_payload, created_at,
  auto_replied, auto_reply_type, auto_reply_at, needs_human, source_channel
  ```

- **customer_id در این لیست نیست.**

- فایل `whatsapp-broadcast-api/api/webhook.js` (خط ۱۱۷۲) فقط این ستون‌ها را INSERT می‌کند:

  ```js
  .insert({ sender_phone: cleanPhone, message_body: messageBody, raw_payload: payload, source_channel: nm.channel })
  ```

  یعنی در کد فعلی هیچ ارجاعی به `customer_id` روی `whatsapp_inbox` وجود ندارد.

- بنابراین اجرای PATCH handler قبل از انجام این migration باعث خطای runtime
  **«column customer_id does not exist»** می‌شود.

- جستجوی `*.sql` در کل ریپو برای `whatsapp_inbox` → **۰ نتیجه** (هیچ تعریف CREATE TABLE برای
  این جدول در منبع موجود نیست؛ schema از طریق dump تأیید شد، نه از فایل SQL در ریپو).

- سند `docs/DATABASE_SOURCE_OF_TRUTH.md` در ریپو **وجود ندارد** (بررسی شد)؛ لذا نوع دقیق
  شناسه مشتری از یک منبع قطعی در دسترس نیست و باید از schemaی staging در زمان اجرا تأیید شود
  (بخش ۴ و ۸).

---

## 4. Proposed Schema Change (تغییر پیشنهادی schema)

پیشنهاد: افزودن یک ستون **nullable** به `public.whatsapp_inbox`:

- اگر جدول مرجع مشتری در staging وجود داشته باشد و نوع primary key آن **uuid** باشد:
  ```sql
  customer_id uuid null
  ```
- اگر primary key مشتری **bigint / integer** باشد:
  ```sql
  customer_id bigint null   -- یا integer، مطابق schema واقعیِ staging
  ```
- اگر نوع customer id از منبع/staging **قابل تأیید نبود** → طبق شرط STOP، migration نباید اجرا
  شود و فرآیند متوقف می‌شود (بخش ۱۲).

> نکته: در `supabase/crm-production-baseline.sql` ستون `customer_id` روی جداول CRM با نوع
> `bigint` تعریف شده و به `crm_customers(id)` ارجاع داده شده است؛ اما این فایل snapshot دقیق
> production است نه الزاماً قراردادِ لینک‌کردن WhatsApp inbox، و نام/نوع جدول مشتری برای
> `whatsapp_inbox.customer_id` از یک source-of-truth واحد **تأیید نشده**. لذا نوع ستون را در
> این طرح **قطعی اعلام نمی‌کنیم** و اجرا را منوط به تأیید staging می‌کنیم.

**Foreign Key (FK):** پیشنهاد **نمی‌شود** به عنوان بخشی از این migration اول اجرا شود.
اگر مالک بخواهد FK اختیاری اضافه شود، باید در یک **مرحلهٔ جداگانه** (با بررسی قفل/ریسک) انجام شود.

---

## 5. Proposed SQL - Draft Only, Do Not Execute

> ### ⛔ DRAFT ONLY - DO NOT EXECUTE WITHOUT STAGING APPROVAL ⛔
> این SQL فقط پیش‌نویس است. قبل از اجرا باید نوع `<CONFIRMED_CUSTOMER_ID_TYPE>` از schemaی
> staging (بخش ۸) قطعی شود. اجرای این SQL بدون تأیید staging و بدون approval مالک ممنوع است.

```sql
-- DRAFT ONLY - DO NOT EXECUTE WITHOUT STAGING APPROVAL
alter table public.whatsapp_inbox
  add column if not exists customer_id <CONFIRMED_CUSTOMER_ID_TYPE>;

comment on column public.whatsapp_inbox.customer_id is
  'Optional link from WhatsApp inbox message to CRM customer. Added for admin inbox linking flow.';
```

جایگزینی `<CONFIRMED_CUSTOMER_ID_TYPE>`:
- پس از اجرای کوئری‌های بخش ۸ روی staging، مقدار دقیق (`uuid` یا `bigint`/`integer`) را قرار دهید.
- اگر نوع قابل تأیید نبود → اجرا نکنید و STOP کنید.

---

## 6. Risk Assessment (ارزیابی ریسک)

- **ALTER TABLE روی جدول زنده:** افزودن ستون nullable معمولاً در PostgreSQL بدون قفل طولانی
  انجام می‌شود، اما روی جدول پر‌ترافیک (webhook پیوسته می‌نویسد) باید در پنجرهٔ نگهداری سبک اجرا شود.
- **نوع اشتباه customer_id:** اگر نوع (uuid در مقابل bigint) اشتباه انتخاب شود، PATCH handler
  هنگام نوشتن با خطای cast/types mismatch مواجه می‌شود.
- **نبود جدول customers یا متفاوت بودن نام جدول:** اگر جدول مرجع مشتری در staging نام/نوع
  متفاوتی داشته باشد، لینک معنایی نخواهد داشت (حتی بدون FK).
- **FK lock risk:** اگر همزمان FK اضافه شود، در جداول بزرگ ممکن است قفل طولانی ایجاد کند؛
  به همین دلیل FK از این migration اول حذف شد.
- **شکست PATCH handler اگر ستون وجود نداشته باشد:** دقیقاً همان دلیلی که این طرح نوشته شد
  (column does not exist).
- **تفاوت staging و production:** schemaی staging ممکن است با dump/pre-CRM-RLS متفاوت باشد؛
  لذا همهٔ verification فقط روی staging انجام می‌شود و production دست‌نخورده می‌ماند.

---

## 7. Backup / Rollback (پشتیبان و بازگشت)

- **قبل از اجرای staging migration:** حتماً باید **backup / snapshot** از پایگاه staging گرفته
  شود (طبق قوانین DEVELOPMENT_RULES §Hard Rules: migration بدون plan + backup note + staging
  verification + owner approval ممنوع است).
- **rollback پیشنهادی (فقط در staging):**
  ```sql
  alter table public.whatsapp_inbox drop column if exists customer_id;
  ```
- **هشدار:** اجرای rollback در **production مجاز نیست** مگر approval **جداگانه** از مالک داشته باشد.
  این طرح فقط staging را پوشش می‌دهد.

---

## 8. Pre-Migration Verification Queries - Staging Only

این کوئری‌ها **فقط روی staging** باید اجرا شوند (قبل از اجرای migration):

```sql
-- 1) بررسی وجود جدول
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'whatsapp_inbox';

-- 2) بررسی ستون‌های فعلی
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'whatsapp_inbox'
order by ordinal_position;

-- 3) بررسی نبودن customer_id
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'whatsapp_inbox'
  and column_name = 'customer_id';
-- انتظار: ۰ ردیف (ستون نباید وجود داشته باشد)

-- 4) بررسی جدول / نوع شناسه مشتری (برای تعیین <CONFIRMED_CUSTOMER_ID_TYPE>)
--    باید جدول صحیح مشتری از source of truth در staging پیدا شود و نوع id آن تأیید شود.
--    کاندیداهای محتمل (بر اساس CRM baseline): crm_customers با id bigint.
--    کوئری پیشنهادی (نام جدول را با تأیید staging جایگزین کنید):
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('crm_customers', 'customers', 'customer_profiles')
  and column_name = 'id';
-- اگر نام جدول مشتری نامطمئن بود → STOP (اجرا نکنید).
```

> تعیین نوع: اگر ستون `id` جدول مشتری در staging `uuid` باشد → `customer_id uuid null`؛
> اگر `bigint`/`integer` باشد → `customer_id bigint null` (یا `integer`). در غیر این صورت STOP.

---

## 9. Post-Migration Verification Queries - Staging Only

```sql
-- تایید وجود ستون جدید با نوع صحیح
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'whatsapp_inbox'
  and column_name = 'customer_id';
-- انتظار: ۱ ردیف با نوعی که در بخش ۸ تأیید شد و is_nullable = 'YES'

-- اطمینان از قابل select بودن جدول (بدون افشای داده حساس)
select id, sender_phone, message_body, created_at, customer_id
from public.whatsapp_inbox
order by created_at desc
limit 5;
```

---

## 10. Staging Smoke Test After Migration

پس از اجرای موفق staging migration، **مرحلهٔ بعدی جداست** (نیازمند approval جداگانه):

1. پیاده‌سازی PATCH handler در `whatsapp-broadcast-api/api/whatsapp_inbox.js`
   (متد PATCH: requireAdmin، استخراج id از URL path، خواندن customer_id از body،
   آپدیت فقط ستون customer_id، پاسخ شامل ستون‌های امن، بدون raw_payload).
2. deploy preview یا staging **با approval جداگانه**.
3. smoke (آنلاین، در staging/preview):
   - `GET /api/webhook` → 200 (health)
   - `GET /api/whatsapp-inbox` بدون token → 401
   - `GET /api/whatsapp-inbox` با token → 200
   - `PATCH /api/whatsapp-inbox/:id` بدون token → 401
   - `PATCH /api/whatsapp-inbox/:id` با body ناقص (بدون customer_id) → 400
   - `PATCH /api/whatsapp-inbox/:id` با customer_id معتبر → 200 (یا تست کنترل‌شده)

---

## 11. Explicit Approvals Required (تأییدهای صریح مورد نیاز)

- **approval فعلی:** فقط برای **آماده‌سازی طرح (prepare plan)** است.
- **اجرای staging migration:** نیاز به **approval جداگانه** دارد.
- **اجرای production migration:** نیاز به **approval جداگانه، بعد از PASS شدن staging** دارد.
- **deploy:** نیاز به **approval جداگانه** و عبور از preflight/smoke gates دارد.

---

## 12. STOP Conditions (شرایط توقف)

مسیر اجرا باید متوقف شود اگر:
- اگر staging schema با dump / source فعلی **متفاوت** بود (و نتوانستیم نوع را تأیید کنیم).
- اگر نوع customer id **مشخص نبود** (uuid یا bigint قابل تأیید نیست).
- اگر جدول مشتری **مشخص نبود** (نام جدول مرجع نامطمئن بود).
- اگر ستون `customer_id` **از قبل با نوع متفاوت** وجود داشت (تضاد schema).
- اگر اتصال staging / prod **نامطمئن** بود (خطر اشتباه محیط).
- اگر **backup / snapshot staging** آماده نبود.
- اگر هر دستوری به **production** اشاره می‌کرد (این طرح فقط staging است).

---

> یادداشت نهایی: این فایل صرفاً یک طرح است. هیچ SQL در آن اجرا نشده، هیچ migration اجرا نشده،
> و هیچ تغییری در production / کد / vercel.json داده نشده است.
