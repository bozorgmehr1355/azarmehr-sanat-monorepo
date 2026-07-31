import React from 'react';

export const SalesChart: React.FC = () => {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">روند فروش شش‌ماهه</h3>
        <span className="text-xs text-[#8b949e]">میلیون تومان</span>
      </div>
      <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-[#30363d]">
        {[
          { month: 'فروردین', val: 40 },
          { month: 'اردیبهشت', val: 65 },
          { month: 'خرداد', val: 50 },
          { month: 'تیر', val: 85 },
          { month: 'مرداد', val: 70 },
          { month: 'شهریور', val: 95 },
        ].map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div
              className="w-full bg-[#1f6feb] hover:bg-[#388bfd] transition-all rounded-t"
              style={{ height: `${item.val}%` }}
              title={`${item.month}: ${item.val} میلیون`}
            />
            <span className="text-[10px] text-[#8b949e]">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const OrderStatusChart: React.FC = () => {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">وضعیت سفارشات اخیر</h3>
        <span className="text-xs text-[#8b949e]">تفکیک وضعیت</span>
      </div>
      <div className="space-y-3">
        {[
          { label: 'تکمیل شده', count: 850, color: '#238636', percent: '60%' },
          { label: 'در حال پردازش', count: 320, color: '#1f6feb', percent: '25%' },
          { label: 'در انتظار پرداخت', count: 180, color: '#d29922', percent: '10%' },
          { label: 'لغو شده', count: 100, color: '#da3633', percent: '5%' },
        ].map((status, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[#c9d1d9]">{status.label}</span>
              <span className="text-[#8b949e]">{status.count} سفارش ({status.percent})</span>
            </div>
            <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: status.percent, backgroundColor: status.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};