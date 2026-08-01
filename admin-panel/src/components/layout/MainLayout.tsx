import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  /** محتوای اصلی صفحه */
  children: React.ReactNode;
  /** ماژول فعال جاری */
  activeItemId: string;
  /** فراخوانی هنگام تغییر ماژول */
  onNavigate: (id: string) => void;
  /** کاربر لاگین‌شده */
  user?: { name?: string; system_role?: string; role?: string } | null;
  /** فراخوانی خروج */
  onLogout?: () => void;
  /** عنوان صفحه برای هدر */
  pageTitle?: string;
}

/**
 * لایوت اصلی پنل ScorpionSales
 * در RTL سایدبار در سمت راست ثابت است؛ محتوای اصلی با pr-64 (و md:pr-64)
 * فضای سایدبار را در نظر می‌گیرد. در موبایل سایدبار به کشوی بازشو تبدیل می‌شود.
 */
export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeItemId,
  onNavigate,
  user,
  onLogout,
  pageTitle,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (id: string) => {
    onNavigate(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* سایدبار دسکتاپ — ثابت در سمت راست */}
      <aside className="hidden lg:flex w-64 shrink-0 fixed inset-y-0 right-0 z-40 border-l border-slate-800">
        <Sidebar
          activeItemId={activeItemId}
          onNavigate={navigate}
          user={user}
          onLogout={onLogout}
        />
      </aside>

      {/* بک‌دراپ موبایل */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="بستن منو"
        />
      )}

      {/* کشوی موبایل */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 max-w-[80vw] lg:hidden transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Sidebar
          activeItemId={activeItemId}
          onNavigate={navigate}
          user={user}
          onLogout={onLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* محتوا — pr-64 برای فضای سایدبار سمت راست (RTL) */}
      <main className="flex-1 flex flex-col min-w-0 lg:pr-64 w-full">
        <Header
          pageTitle={pageTitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="p-3 md:p-6 max-w-[1600px] w-full mx-auto flex-1">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
