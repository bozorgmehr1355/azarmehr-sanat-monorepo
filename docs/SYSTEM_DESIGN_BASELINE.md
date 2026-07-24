# SYSTEM_DESIGN_BASELINE
Project: ScorpionSales / Azarmehr Sanat  
Status: **design not approved for product final** — baseline for review  
Date (Gregorian): 2026-07-24 · Jalali: 1405-05-02  
Owner: Hassan Azimzadeh (product) · Super Admin: Mohammadreza Bozorgmehr  
Scope of this doc: **boundaries only** — not feature roadmap, not Gate report.

---

## 1. Purpose

این سند **Source of truth مرز سیستم** است تا:
- رشد monorepo بدون قانون متوقف شود
- feature جدید روی مرز اشتباه سوار نشود
- PASS فنی (smoke/route) با «دیزاین تأییدشده» اشتباه گرفته نشود

**معیار محصولی (از پیشنهاد مسیر بعدی):**  
قابلیت وقتی PASS است که برای کاربر نهایی usable باشد؛ endpoint سبز به‌تنهایی محصول نیست.

---

## 2. System one-liner

سیستم عملیاتی/CRM آذرمهر صنعت برای:
مشتری · سفارش · پیگیری · قیمت رسمی از پرتال · کار داخلی · جلسه→task · ارتباطات (WhatsApp/Bale/داخلی) · پنل مدیریت.

---

## 3. Apps & ownership (LOCKED draft)

| App / path | Role (does) | Does NOT |
|---|---|---|
| **backend/** | Source of truth داده و API هسته: auth/JWT (`system_role`), customers, orders, leads, payments (core), proforma (core), admin business APIs. Handlers under `/handlers`; unified entry. | UI ادمین؛ broadcast logic کانال؛ قیمت‌گذاری جایگزین پرتال |
| **admin-panel/** | UI عملیات داخلی (React/standalone، IRANSans): CRM views، orders، WhatsApp management UI، reports مصرفی. API base فقط via `resolveApiBase` / `na()`. | Business rule پنهان بلندمدت در HTML غول؛ DB مستقیم؛ source of truth قیمت |
| **whatsapp-broadcast-api/** | کانال WhatsApp: inbox, broadcast, webhook, Ultramsg integration. | CRM کامل؛ مالک customer/order master data |
| **messenger-app/** | پیام‌رسان داخلی سازمان. | جایگزین WhatsApp API؛ master CRM |
| **wholesale-portal/** | پرتال عمده/مشتری بیرونی؛ **قیمت فقط از اینجا (policy)**. | پنل ادمین داخلی؛ broadcast |

**Monorepo root (ops):** `F:\azarmehr-sanat-monorepo`  
**Secrets:** `/coades.env.txt` ignored — never commit.

---

## 4. Domain ownership

| Domain | System of record | Primary consumer UI |
|---|---|---|
| Identity / roles (JWT, system_role) | backend | admin-panel |
| Customer | backend | admin-panel (+ portal read as allowed) |
| Order + status trail | backend | admin-panel |
| Lead | backend | admin-panel |
| Proforma / Payment (core) | backend | admin-panel |
| Price list (customer-facing) | wholesale-portal policy | portal |
| WhatsApp message transport | whatsapp-broadcast-api | admin-panel (view/actions) |
| Internal chat | messenger-app | messenger-app |
| Meeting → task / performance (planned) | backend (when built) | admin-panel |

**قانون:** داده master فقط در owner نوشته می‌شود. بقیه **read + deep-link** یا API رسمی owner.

---

## 5. Cross-app rules

1. **یک API base per consumer** — admin به backend prod؛ WhatsApp UI به whatsapp-broadcast-api؛ بدون hardcode پراکنده جدید.
2. **Auth:** JWT + system_role؛ WhatsApp-Admin Auth Bridge فقط در قرارداد موجود؛ باز نکردن auth مگر fail رسمی همان gate.
3. **Entity navigation (UI):** هر hop باید روی id موجودیت owner باشد (مثلاً `customer_id` روی order). بدون id → BLOCKED نه حدس.
4. **Channels (WhatsApp/Bale):** transport جدا از CRM؛ لینک به customer/lead/order با id، نه کپی master.
5. **Deploy / migration / package / DB write:** فقط دستور صریح انسان.
6. **PowerShell:** `;` نه `&&`. Vercel با `-NoProfile` طبق عادت تیم.
7. **Node:** 22.x/24.x · **PG:** 17.4 · **Supabase** طبق قرارداد سرویس.

---

## 6. Explicit prohibitions (ممنوع)

```text
- Feature Phase 2/3 (Voice, Petty cash, SMS AI, Executive center) قبل از Design baseline + CRM core usable
- کپی master customer/order داخل whatsapp DB/tables جدا به‌عنوان truth
- قیمت رسمی خارج از wholesale-portal
- بازطراحی auth/JWT «در میانه» hop UI
- God-file رشد بی‌پایان admin بدون استخراج مرز (هدف میان‌مدت: routes/views per domain)
- Endpoint جدید بدون: owner دامنه + consumer + معیار usable
- deploy از روی partial hop بدون smoke همان مسیر
- اسناد متناقض موازی؛ وضعیت gate در گزارش جدا، مرز در این فایل
```

---

## 7. Design approval state

| Item | State |
|---|---|
| Runtime Gate (login, API base, WhatsApp smoke, lists) | operational progress (separate Gate log) |
| **System design (this baseline)** | **NOT APPROVED as final architecture** |
| Admin IA / navigation model | pending D2 |
| SERVICE_CONTRACTS alignment | pending D3 |
| OrderDetail → Customer hop | tactical only until D2 |

---

## 8. Next design gates (not started here)

| ID | Goal |
|---|---|
| D1 | Entity graph + allowed hops |
| D2 | Admin navigation law (tab/state/route per entity) |
| D3 | SERVICE_CONTRACTS read-path per domain |
| then | hop OrderDetail→Customer **under D2** |

---

## 9. PawWork compliance note

```text
هر مرحله اجرایی بعد از این سند:
یک target · یک goal · PASS یا BLOCKED + اولین خطا
تحلیل کلی ممنوع مگر لازم
```

---

## 10. Change control

تغییر جدول §3 یا §4 = تصمیم صریح product/admin · PR docs · بدون code اجباری هم‌زمان.
