import React from 'react';
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  ShoppingCart01Icon,
  Folder01Icon,
  Wallet01Icon,
  PackageIcon,
  Shield01Icon,
  SparklesIcon,
  InboxIcon,
  Chart01Icon,
  Settings01Icon,
  Logout01Icon,
  Cancel01Icon,
  More01Icon,
} from 'hugeicons-react';
import { navigationModules, type SidebarItem } from '../../types/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// نگاشت id هر ماژول به آیکون hugeicons (متناسب با نوع ماژول)
// ─────────────────────────────────────────────────────────────────────────────
const MODULE_ICONS: Record<string, React.ReactNode> = {
  dashboard: <DashboardSquare01Icon className="w-5 h-5 text-blue-400" />,
  crm: <UserGroupIcon className="w-5 h-5 text-violet-400" />,
  orders: <ShoppingCart01Icon className="w-5 h-5 text-amber-400" />,
  projects: <Folder01Icon className="w-5 h-5 text-sky-400" />,
  finance: <Wallet01Icon className="w-5 h-5 text-emerald-400" />,
  products: <PackageIcon className="w-5 h-5 text-lime-400" />,
  warranty: <Shield01Icon className="w-5 h-5 text-orange-400" />,
  'ai-agent': <SparklesIcon className="w-5 h-5 text-purple-400" />,
  inbox: <InboxIcon className="w-5 h-5 text-teal-400" />,
  reports: <Chart01Icon className="w-5 h-5 text-pink-400" />,
  settings: <Settings01Icon className="w-5 h-5 text-slate-400" />,
};

interface SidebarProps {
  /** ماژول فعال جاری (id) */
  activeItemId: string;
  /** فراخوانی هنگام انتخاب ماژول */
  onNavigate: (id: string) => void;
  /** کاربر لاگین‌شده */
  user?: { name?: string; system_role?: string; role?: string } | null;
  /** فراخوانی خروج */
  onLogout?: () => void;
  /** بستن سایدبار (موبایل) */
  onClose?: () => void;
}

const roleLabel = (user: SidebarProps['user']): string => {
  if (user?.system_role === 'super_admin') return 'مدیر ارشد سیستم';
  if (user?.system_role === 'admin') return 'مدیر سیستم';
  return user?.role || 'کاربر';
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeItemId,
  onNavigate,
  user,
  onLogout,
  onClose,
}) => {
  const renderItem = (item: SidebarItem) => {
    const isActive = activeItemId === item.id;
    return (
      <button
        key={item.id}
        onClick={() => !item.disabled && onNavigate(item.id)}
        disabled={item.disabled}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
          isActive
            ? 'bg-slate-700/50 text-white border border-slate-600/40 font-semibold'
            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
        } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span className="shrink-0">
          {item.icon ?? MODULE_ICONS[item.id] ?? <More01Icon className="w-5 h-5 text-slate-400" />}
        </span>
        <span className="truncate flex-1 text-right">{item.label}</span>
        {item.badge && (
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col justify-between h-full select-none bg-slate-900">
      <div>
        {/* لوگو و نام پروژه */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/20">
              عقرب
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-sm leading-tight">ScorpionSales</h1>
              <p className="text-[11px] text-slate-500">پنل مدیریت یکپارچه</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden w-8 h-8 rounded-md bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              aria-label="بستن منو"
            >
              <Cancel01Icon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* گروه‌های منو */}
        <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-150px)]">
          {navigationModules.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                {group.title}
              </span>
              {group.items.map(renderItem)}
            </div>
          ))}
        </nav>
      </div>

      {/* اطلاعات کاربر */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
            {(user?.name || '؟').charAt(0)}
          </div>
          <div className="truncate flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.name || 'کاربر'}</p>
            <p className="text-[10px] text-slate-400 truncate">{roleLabel(user)}</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="خروج از سیستم"
              className="shrink-0 w-8 h-8 rounded-md bg-slate-800 hover:bg-red-600/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <Logout01Icon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
