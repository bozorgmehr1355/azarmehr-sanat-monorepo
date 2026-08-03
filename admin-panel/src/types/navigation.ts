import type { ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// تعریف ساختار منوی پنل ScorpionSales
// هر ماژول با یک مسیر (route) و برچسب فارسی معرفی می‌شود؛ آیکون‌ها از
// hugeicons-react هستند (مجموعه آیکون موجود در پروژه).
// ─────────────────────────────────────────────────────────────────────────────

export type SidebarItem = {
  /** شناسه یکتای ماژول — همان value ای که در روتینگ استفاده می‌شود */
  id: string;
  /** برچسب فارسی نمایشی در منو */
  label: string;
  /** مسیر ناوبری ماژول (hash routing) */
  route: string;
  /** آیکون ماژول */
  icon?: ReactNode;
  /** نشان کوچک کنار آیتم (اختیاری) */
  badge?: string;
  /** اگر ماژول هنوز فعال نیست */
  disabled?: boolean;
};

export type SidebarGroup = {
  /** عنوان گروه در منو */
  title: string;
  /** آیتم‌های زیرمجموعه گروه */
  items: SidebarItem[];
};

/**
 * ۱۱ ماژول پنل ScorpionSales در سه گروه:
 *   ۱) هسته اصلی: داشبورد، CRM، فروش، پروژه‌ها
 *   ۲) مالی و پشتیبانی: مالی، انبار، پشتیبانی
 *   ۳) ابزارها و هوش مصنوعی: AI، ارتباطات، گزارش‌ها، تنظیمات
 */
export const navigationModules: SidebarGroup[] = [
  {
    title: 'هسته اصلی',
    items: [
      { id: 'dashboard', label: 'داشبورد', route: '/dashboard' },
      { id: 'crm', label: 'مدیریت مشتریان', route: '/crm' },
      { id: 'orders', label: 'فروش و سفارش‌ها', route: '/orders' },
      { id: 'projects', label: 'پروژه‌ها', route: '/projects' },
    ],
  },
  {
    title: 'مالی و پشتیبانی',
    items: [
      { id: 'finance', label: 'مالی و حسابداری', route: '/finance' },
      { id: 'products', label: 'انبار و محصولات', route: '/products' },
      { id: 'warranty', label: 'گارانتی و پشتیبانی', route: '/warranty' },
    ],
  },
  {
    title: 'ابزارها و هوش مصنوعی',
    items: [
      { id: 'ai-agent', label: 'دستیار هوشمند (AI)', route: '/ai-agent' },
      { id: 'inbox', label: 'ارتباطات و پیام‌ها', route: '/inbox' },
      { id: 'data-cleanup', label: 'پاکسازی داده', route: '/data-cleanup' },
      { id: 'reports', label: 'گزارش‌ها و تحلیل', route: '/reports' },
      { id: 'settings', label: 'تنظیمات سیستم', route: '/settings' },
    ],
  },
];

/** نگاشت id هر ماژول به آیتم منو — برای یافتن سریع در کامپوننت‌ها */
export const navigationIndex: Record<string, SidebarItem> = navigationModules
  .flatMap((g) => g.items)
  .reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<string, SidebarItem>);
