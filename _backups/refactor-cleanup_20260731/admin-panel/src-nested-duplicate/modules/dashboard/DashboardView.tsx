import React from 'react';
import { KPICard, KPIGrid, KPICardProps } from './components/KPICards';
import { SalesChart, OrderStatusChart } from './components/Charts';

const sampleKPICards: KPICardProps[] = [
  { label: 'مشتریان عمده', value: '۱۲۸', subtext: 'فعال', color: '#3b82f6', icon: '👥' },
  { label: 'کل سفارشات', value: '۱,۴۵۰', subtext: 'ثبت شده', color: '#10b981', icon: '🛒' },
  { label: 'درآمد ثبت‌شده', value: '۴۵۰,۰۰۰,۰۰۰ تومان', subtext: 'ماه جاری', color: '#d97706', icon: '💰' },
  { label: 'در انتظار پرداخت', value: '۱۲', subtext: 'پیش‌فاکتورها', color: '#f59e0b', icon: '⚠️' },
  { label: 'محصولات', value: '۱۴', subtext: 'فعال در انبار', color: '#06b6d4', icon: '📦' },
  { label: 'مرجوعی در انتظار', value: '۰', subtext: 'نیاز به بررسی', color: '#ef4444', icon: '🛡️' },
];

export const DashboardView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">داشبورد مدیریتی</h1>
        <span className="text-xs text-[#8b949e]">آخرین بروزرسانی: لحظاتی پیش</span>
      </div>

      <KPIGrid>
        {sampleKPICards.map((card, idx) => (
          <KPICard key={idx} {...card} />
        ))}
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <OrderStatusChart />
      </div>
    </div>
  );
};