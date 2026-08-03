import React from 'react';

export const MessengerView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#161b22] p-4 rounded-lg border border-[#30363d] flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">پیام‌رسان / واتساپ & بله</h2>
          <p className="text-sm text-[#8b949e]">مدیریت گفتگوهای مشتریان، ربات‌های پاسخگو و ارسال پیام انبوه</p>
        </div>
        <span className="bg-[#238636] text-white text-xs px-3 py-1 rounded-full">سرویس فعال</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-lg space-y-3">
          <h3 className="text-md font-semibold text-white flex items-center gap-2">
            <span>💬</span> واتساپ (WhatsApp API)
          </h3>
          <p className="text-xs text-[#8b949e]">اتصال به API واتساپ، مدیریت Inbox و مشتریان استیجینگ</p>
          <div className="text-xs text-[#3fb950]">✓ وضعیت: متصل به سرویس مرکزی</div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-lg space-y-3">
          <h3 className="text-md font-semibold text-white flex items-center gap-2">
            <span>✈️</span> پیام‌رسان بله (Bale Adapter)
          </h3>
          <p className="text-xs text-[#8b949e]">دریافت سفارشات و اعلان‌های آنی از طریق آداپتور بله</p>
          <div className="text-xs text-[#3fb950]">✓ وضعیت: آماده به کار</div>
        </div>
      </div>
    </div>
  );
};