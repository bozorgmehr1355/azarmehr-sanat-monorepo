import React from 'react';

export const CRMView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#161b22] p-4 rounded-lg border border-[#30363d]">
        <div>
          <h2 className="text-xl font-bold text-white">مدیریت مشتریان (CRM)</h2>
          <p className="text-sm text-[#8b949e]">لیست مشتریان عمده و خرده، پرونده خرید و تعاملات</p>
        </div>
        <button className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded text-sm font-semibold transition">
          + افزودن مشتری جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg">
          <div className="text-[#8b949e] text-xs">کل مشتریان حقوقی/عمده</div>
          <div className="text-2xl font-bold text-white mt-1">۱۲۸</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg">
          <div className="text-[#8b949e] text-xs">خریداران فعال این ماه</div>
          <div className="text-2xl font-bold text-[#3fb950] mt-1">۴۵</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg">
          <div className="text-[#8b949e] text-xs">پیگیری‌های معوق</div>
          <div className="text-2xl font-bold text-[#f85149] mt-1">۳</div>
        </div>
      </div>
    </div>
  );
};