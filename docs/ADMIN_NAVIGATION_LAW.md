# ADMIN_NAVIGATION_LAW
Project: ScorpionSales / Azarmehr Sanat  
Parent: `docs/SYSTEM_DESIGN_BASELINE.md` (commit baseline)  
Status: **law draft for implementation** — design final هنوز تأیید کامل نیست  
Date: 2026-07-24 · 1405-05-02  
Scope: **admin-panel ONLY** — navigation / tab / entity open rules  
ممنوع در این سند: backend contract rewrite · deploy · feature جدید خارج ناوبری

---

## 1. Purpose

یک قانون واحد برای:
- باز کردن موجودیت‌ها در admin-panel
- hop بین صفحات (به‌ویژه Order → Customer)
- جلوگیری از حدس UI وقتی `id` نیست

**اصل:** ناوبری = `required id` + `open action` شناخته‌شده. بدون id → **BLOCKED** (نه ساخت entity جعلی).

---

## 2. Shell model (admin-panel)

Admin فعلاً **tab/state-driven** است (نه router کامل چندصفحه‌ای الزامی).

| مفهوم | معنی |
|---|---|
| **tab** | بخش اصلی UI (مثلاً `crm`, `orders`, WhatsApp, …) — نام exact در کد ممکن است فارسی/انگلیسی باشد؛ قانون با **نقش** tab است |
| **surface** | list \| detail \| nested panel |
| **focus id** | شناسه موجودیت باز در detail |
| **open action** | تابع/مسیر state موجود پنل برای گذاشتن tab + focus id + بارگذاری detail |

```text
قانون پوسته:
1) همیشه اول tab درست
2) بعد focus id
3) بعد load detail از API owner (backend) — نه cache حدسی
4) Back: detail → list همان tab (مگر breadcrumb صریح)

**API base:** فقط `resolveApiBase` / `na()` — در ناوبری دست نزن.
```

---

## 3. Entity → open law

| Entity | System of record | Tab نقش | Surface | Required id | Open action (قانون) | اگر id نباشد |
|---|---|---|---|---|---|---|
| **Customer** | backend | CRM / customers | list + detail | `customer_id` (UUID/text همان API) | `openCustomer(customer_id)` ≡ setTab(CRM) + focus customer + fetch customer detail | BLOCKED |
| **Order** | backend | Orders | list + detail | `order_id` | `openOrder(order_id)` ≡ setTab(Orders) + focus order + fetch order detail | BLOCKED |
| **Lead** | backend | Leads (وقتی UI هست) | list + detail | `lead_id` | `openLead(lead_id)` | BLOCKED — UI نباشد: no hop |
| **Proforma** | backend | Finance/Proforma یا زیر Order | detail | `proforma_id` (+ ترجیحاً `order_id`) | `openProforma` | BLOCKED |
| **Payment** | backend | Payments / زیر Order | detail | `payment_id` | `openPayment` | BLOCKED |
| **WhatsApp thread/inbox item** | whatsapp-broadcast-api | WhatsApp | inbox list + thread | thread/message id کانال | باز کردن در tab واتساپ؛ **لینک CRM فقط با customer_id/lead_id واقعی** | بدون link CRM |
| **Broadcast job** | whatsapp-broadcast-api | WhatsApp | broadcast | job id | فقط tab واتساپ | — |

نام tab در کد هرچه هست، **نقش** بالا الزامی است.

---

## 4. Allowed hops (گراف مجاز UI)

| From surface | Control | To | Required fields on source payload | Behavior |
|---|---|---|---|---|
| **OrderDetail** | نام/کد مشتری (clickable) | Customer detail | `customer_id` **الزامی**؛ نمایش نام اختیاری | `openCustomer(customer_id)` — **اولویت P0** |
| **OrderDetail** | order id (self) | — | `order_id` | بدون hop اضافه |
| **CustomerDetail** | ردیف سفارش | Order detail | `order_id` | `openOrder(order_id)` — **P1** (متقارن) |
| **CustomerDetail** | لینک واتساپ | WhatsApp tab | channel id **و/یا** `customer_id` برای filter | بدون ساخت thread جعلی |
| **Orders list** | ردیف | Order detail | `order_id` | `openOrder` |
| **Customers list** | ردیف | Customer detail | `customer_id` | `openCustomer` |
| **Lead detail** | convert/open customer | Customer | `customer_id` بعد از convert | فقط بعد از وجود id |
| **Inbox row** | «باز کردن مشتری» | Customer | `customer_id` لینک‌شده | وگرنه فقط thread |

### Hops ممنوع (تا قانون بعدی)

```text
- OrderDetail → Customer با match روی «نام» بدون customer_id
- هر hop به entity بدون fetch از owner API
- باز کردن portal قیمت از داخل admin به‌جای policy پرتال
- پرش به backend route خام در window مگر ابزار debug صریح
- Nested hop زنجیره‌ای بدون Back روشن (Order→Customer→Order→…) بدون stack ساده
```

---

## 5. P0 implementation law: OrderDetail → Customer

### 5.1 Preconditions (همه لازم)

```text
PASS design-align فقط اگر:
1) Order detail payload شامل customer_id (یا نام فیلد معادل قرارداد API موجود، یک‌نام در کل پنل) باشد
2) openCustomer(customer_id) از قبل در پنل وجود داشته باشد
   یا معادل setTab(CRM) + همان loader لیست/جزئیات مشتری که list امروز استفاده می‌کند
3) کنترل UI: نام مشتری button/link؛ بدون redesign فرم
```

### 5.2 Behavior

```text
onClick نام مشتری در OrderDetail:
  → openCustomer(order.customer_id)
  → tab نقش CRM
  → detail همان مشتری (id برابر)
  → Orders list نشکند؛ Back ترجیحی: بازگشت به OrderDetail همان order_id اگر stack ساده دارید؛ وگرنه Customer detail کافی است (در PR مشخص شود)
```

### 5.3 Blocker matrix

| شرط | result | اقدام |
|---|---|---|
| `customer_id` در payload سفارش نیست | **BLOCKED** | بدون UI clickable؛ گزارش فیلدهای موجود order |
| openCustomer / loader مشتری از id نیست | **BLOCKED** | بدون حدس؛ فقط گزارش gap |
| id هست + open هست | code hop مجاز | بعد smoke دستی |
| design baseline / این قانون | tactical hop قبلی | بعد از merge این doc = **design-aligned hop** |

---

## 6. Shared open-action contract (هدف میان‌مدت UI)

یک سطح نام‌گذاری (حتی اگر امروز functionهای پراکنده است):

```text
openCustomer(customer_id)
openOrder(order_id)
openLead(lead_id)          // when surface exists
openWhatsAppThread(id)     // channel side
```

قواعد:
- آرگومان **فقط id** (نه whole row اجباری؛ row می‌تواند cache نمایش باشد)
- بعد از open: **fetch** از API؛ به row کهنه اعتماد کامل نکن
- خطا شبکه: پیام UI؛ tab را در حالت نیمه‌باز رها نکن بدون empty/error state

---

## 7. Smoke checklist (ناوبری)

| # | Steps | PASS |
|---|---|---|
| N1 | Orders list → Order detail | detail همان order |
| N2 | Order detail → click customer name | Customer detail همان `customer_id` |
| N3 | Customer detail → click one order (P1) | Order detail همان order |
| N4 | WhatsApp inbox usable (existing Gate) | بدون شکستن CRM hop |
| N5 | Login + API base | بدون دست‌کاری resolveApiBase |

N2 = معیار بستن BLOCKED ناوبری Order→Customer.

---

## 8. Relation to phases

| Doc / phase | نقش |
|---|---|
| SYSTEM_DESIGN_BASELINE | مرز اپ و دامنه |
| **ADMIN_NAVIGATION_LAW (this)** | hop و tab داخل admin |
| Gate 5 tactical | runtime؛ hop تا قبل این doc = tactical only |
| Phase 1 CRM Core | بعد از N2 و orders status — نه قبل از قانون ناوبری برای work بزرگ |

---

## 9. Change control

- تغییر جدول §3 یا §4 = به‌روزرسانی این فایل در همان PR که UI hop را عوض می‌کند.
- Code hop بدون ارجاع به §5 = خلاف PawWork design path.

---

## 10. Next action after this file is committed

```text
target: admin-panel ONLY
goal: P0 hop OrderDetail → Customer per §5
result: PASS (N2) | BLOCKED (matrix §5.3)
deploy: فقط با دستور صریح بعد از PASS کد
```
