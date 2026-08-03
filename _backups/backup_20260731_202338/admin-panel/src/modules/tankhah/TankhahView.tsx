import React from 'react';

export const TankhahView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#161b22] p-4 rounded-lg border border-[#30363d] flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">سامانه تنخواهیار (TankhahYar)</h2>
          <p className="text-sm text-[#8b949e]">مدیریت تنخواه، فاکتورها، تنخواه‌داران و اسناد پرداختی</p>
        </div>
        <button className="bg-[#1f6feb] hover:bg-[#388bfd] text-white px-4 py-2 rounded text-sm font-semibold transition">
          + ثبت درخواست تنخواه جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg">
          <div className="text-[#8b949e] text-xs">موجودی صندوق تنخواه</div>
          <div className="text-xl font-bold text-[#3fb950] mt-1">۲۵,۰۰۰,۰۰۰ تومان</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg">
          <div className="text-[#8b949e] text-xs">درخواست‌های در انتظار تایید</div>
          <div className="text-xl font-bold text-[#d29922] mt-1">۴ مورد</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg">
          <div className="text-[#8b949e] text-xs">هزینه کرد این ماه</div>
          <div className="text-xl font-bold text-white mt-1">۱۸,۵۰۰,۰۰۰ تومان</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg">
          <div className="text-[#8b949e] text-xs">تنخواه‌داران فعال</div>
          <div className="text-xl font-bold text-white mt-1">۳ نفر</div>
        </div>
      </div>
    </div>
  );
};