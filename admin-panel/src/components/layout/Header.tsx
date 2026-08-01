import React, { useState } from 'react';
import {
  Search01Icon,
  Notification01Icon,
  QuestionIcon,
  Menu01Icon,
} from 'hugeicons-react';

interface HeaderProps {
  /** عنوان جاری صفحه (برای نمایش در هدر) */
  pageTitle?: string;
  /** وضعیت اتصال به سرویس‌ها */
  connected?: boolean;
  /** فراخوانی باز کردن سایدبار (موبایل) */
  onMenuClick?: () => void;
  /** تعداد اعلان‌های خوانده‌نشده */
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle = 'پنل مدیریت',
  connected = true,
  onMenuClick,
  notificationCount = 0,
}) => {
  const [search, setSearch] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="h-14 border-b border-slate-800 px-3 md:px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur sticky top-0 z-30 gap-3">
      {/* سمت راست (RTL): منو + عنوان */}
      <div className="flex items-center gap-2 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden w-9 h-9 shrink-0 rounded-md bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center"
            aria-label="باز کردن منو"
          >
            <Menu01Icon className="w-5 h-5" />
          </button>
        )}
        <div className="text-xs text-slate-300 font-medium truncate">{pageTitle}</div>
      </div>

      {/* وسط: نوار جستجو */}
      <div className="hidden md:flex flex-1 max-w-md mx-auto relative">
        <Search01Icon className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در پنل..."
          className="w-full h-9 pr-9 pl-3 rounded-lg bg-slate-800/70 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
        />
      </div>

      {/* سمت چپ (RTL): وضعیت + اعلان‌ها + راهنما */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            connected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
          />
          <span className="hidden sm:inline">{connected ? 'متصل' : 'قطع'}</span>
        </span>

        <button
          title="اعلان‌ها"
          className="relative w-9 h-9 rounded-md bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center"
          aria-label="اعلان‌ها"
        >
          <Notification01Icon className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            title="راهنما"
            onClick={() => setShowHelp((v) => !v)}
            className="w-9 h-9 rounded-md bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center"
            aria-label="راهنما"
          >
            <QuestionIcon className="w-5 h-5" />
          </button>
          {showHelp && (
            <div className="absolute left-0 top-11 w-56 rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl z-40">
              <p className="text-[11px] text-slate-300 leading-5">
                برای جابجایی بین ماژول‌ها از منوی سمت راست استفاده کنید. هر ماژول وظیفهٔ
                مشخصی دارد و داده‌ها از بک‌اند مرکزی (Supabase) بارگذاری می‌شوند.
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
