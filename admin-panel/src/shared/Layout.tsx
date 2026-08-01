import React, { useState } from 'react';
import {
  DashboardSquare01Icon,
  Wallet01Icon,
  WarehouseIcon,
  Store01Icon,
  ShoppingCart01Icon,
  PackageIcon,
  UserSearch01Icon,
  UserGroupIcon,
  Folder01Icon,
  InboxIcon,
  SparklesIcon,
  WhatsappIcon,
  Cash01Icon,
  Shield01Icon,
  Settings01Icon,
  Menu01Icon,
  Cancel01Icon,
  Logout01Icon,
} from 'hugeicons-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: { name?: string; role?: string; system_role?: string } | null;
  onLogout?: () => void;
}

const SidebarContent: React.FC<{
  activeTab: string;
  onNavigate: (tab: string) => void;
  user?: LayoutProps['user'];
  onLogout?: () => void;
  onClose?: () => void;
}> = ({ activeTab, onNavigate, user, onLogout, onClose }) => {
  const menuGroups = [
    {
      title: 'اصلی',
      items: [
        { id: 'dashboard', label: 'داشبورد', icon: <DashboardSquare01Icon className="w-5 h-5 text-blue-400" /> },
        { id: 'finance', label: 'مالی و حسابداری', icon: <Wallet01Icon className="w-5 h-5 text-emerald-400" /> },
      ]
    },
    {
      title: 'مشتریان و فروش',
      items: [
        { id: 'wholesale', label: 'عمده‌فروشی (B2B)', icon: <WarehouseIcon className="w-5 h-5 text-indigo-400" /> },
        { id: 'retail', label: 'خرده‌فروشی', icon: <Store01Icon className="w-5 h-5 text-cyan-400" /> },
        { id: 'orders', label: 'مدیریت سفارشات', icon: <ShoppingCart01Icon className="w-5 h-5 text-amber-400" /> },
        { id: 'products', label: 'مدیریت محصولات', icon: <PackageIcon className="w-5 h-5 text-lime-400" /> },
        { id: 'leads', label: 'لیدها و پیگیری‌ها', icon: <UserSearch01Icon className="w-5 h-5 text-rose-400" /> },
        { id: 'crm', label: 'ارتباط با مشتری (CRM)', icon: <UserGroupIcon className="w-5 h-5 text-violet-400" /> },
        { id: 'projects', label: 'پروژه‌ها', icon: <Folder01Icon className="w-5 h-5 text-blue-400" /> },
      ]
    },
    {
      title: 'ارتباطات و هوش مصنوعی',
      items: [
        { id: 'inbox', label: 'صندوق پیام‌ها', icon: <InboxIcon className="w-5 h-5 text-teal-400" /> },
        { id: 'ai-agent', label: 'دستیار هوشمند (AI)', icon: <SparklesIcon className="w-5 h-5 text-purple-400" /> },
        { id: 'whatsapp', label: 'ارسال انبوه واتساپ', icon: <WhatsappIcon className="w-5 h-5 text-green-400" /> },
      ]
    },
    {
      title: 'تنظیمات و پشتیبانی',
      items: [
        { id: 'tankhahyar', label: 'تنخواه یار', icon: <Cash01Icon className="w-5 h-5 text-sky-400" /> },
        { id: 'warranty', label: 'گارانتی و خدمات', icon: <Shield01Icon className="w-5 h-5 text-orange-400" /> },
        { id: 'settings', label: 'تنظیمات سیستم', icon: <Settings01Icon className="w-5 h-5 text-slate-400" /> },
      ]
    }
  ];

  return (
    <div className="flex flex-col justify-between h-full select-none">
      <div>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
              AZ
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-sm leading-tight">آذرمهر صنعت</h1>
              <p className="text-[11px] text-slate-400">پنل مدیریت یکپارچه</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-md bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              aria-label="بستن منو"
            >
              <Cancel01Icon className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                {group.title}
              </span>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
            {(user?.name || '؟').charAt(0)}
          </div>
          <div className="truncate flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.name || 'کاربر'}</p>
            <p className="text-[10px] text-slate-400 truncate">
              {user?.system_role === 'super_admin'
                ? 'مدیر ارشد سیستم'
                : user?.system_role === 'admin'
                  ? 'مدیر سیستم'
                  : user?.role || 'کاربر'}
            </p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="خروج از سیستم"
              className="shrink-0 w-7 h-7 rounded-md bg-slate-800 hover:bg-red-600/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <Logout01Icon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans dir-rtl" dir="rtl">
      {/* سایدبار دسکتاپ */}
      <aside className="hidden md:flex w-64 shrink-0 bg-slate-900 border-l border-slate-800">
        <SidebarContent activeTab={activeTab} onNavigate={navigate} user={user} onLogout={onLogout} />
      </aside>

      {/* بک‌دراپ موبایل */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="بستن منو"
        />
      )}

      {/* کشوی موبایل */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 max-w-[80vw] bg-slate-900 md:hidden transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <SidebarContent
          activeTab={activeTab}
          onNavigate={navigate}
          user={user}
          onLogout={onLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        <header className="h-14 border-b border-slate-800 px-3 md:px-6 flex items-center justify-between bg-slate-900/30 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 shrink-0 rounded-md bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center"
              aria-label="باز کردن منو"
            >
              <Menu01Icon className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-400 font-medium truncate">
              سیستم مدیریت عملیاتی آذرمهر
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">سرویس‌ها</span>
              <span className="sm:hidden">✓</span>
            </span>
          </div>
        </header>

        <div className="p-3 md:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
