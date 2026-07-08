# Azarmehr Sanat Monorepo — Agent Instructions

## پروژه
آذرمهر صنعت — سامانه یکپارچه مدیریت فروش و CRM (Node.js + Express/Supabase/React)

## زبان و تاریخ
- زبان خروجی و کامنت‌ها: **فارسی** (مگر اینکه کاربر انگلیسی بخواهد)
- تاریخ‌ها: **هجری شمسی** (۱۴۰۵)
- برند: **گروه محصولات غذایی عقرب**

## زیرپروژه‌ها

| سرویس | مسیر | توضیح |
|-------|------|-------|
| Backend API | `backend/` | Express API روی Vercel |
| Admin Panel | `admin-panel/` | پنل مدیریت داخلی (React standalone) |
| Wholesale Portal | `wholesale-portal/` | پورتال مشتریان عمده‌فروش |
| WhatsApp API | `whatsapp-broadcast-api/` | ربات واتساپ (UltraMsg → Vercel → Supabase) |
| Messenger App | `messenger-app/` | پیام‌رسان داخلی |
| Supabase | `supabase/` | کانفیگ و مایگریشن‌های دیتابیس |

## قواعد معماری

1. **منبع داده**: Supabase منبع اصلی است — هیچ JSON file به‌عنوان data source مجاز نیست.
2. **فروش خرد**: فقط از طریق وب‌سایت شرکت (scorpiongroup.ir) — CRM تحلیلی است، نه فروش مستقیم.
3. **فروش عمده**: مسیر مستقل از طریق Wholesale Portal.
4. **احراز هویت**: JWT با bcrypt — دو مسیر جداگانه (admin و customer).
5. **نام محصولات (SSOT)**: `محصولات.txt` در ریشه پروژه، مرجع قطعی نام تمام محصولات است. هر تغییری فقط در این فایل اعمال شود.
6. **قیمت در واتساپ**: ارسال قیمت عمده در واتساپ ممنوع — مشتریان به پورتال هدایت شوند.

## پیش از commit/deploy
- همیشه اجرا شود: `node scripts/validate-products.js`

## استانداردهای کد
- **Type**: commonjs (require/module.exports)
- **Backend**: Express + Vercel Serverless Functions
- **Frontend**: React با Babel standalone (jsx)
- **Database**: PostgreSQL (Supabase)
- **WhatsApp**: UltraMsg webhook → Intent Engine (فارسی) → Supabase
