import React from 'react';
import { KPIGrid, KPICardProps } from './components/KPICards';
import { DashboardCharts } from './components/Charts';

const sampleKPICards: KPICardProps[] = [
  { label: 'مشتریان عمده', value: '۱۲۸', sub: 'فعال', color: '#3b82f6', icon: '👥' },
  { label: 'کل سفارشات', value: '۱,۴۵۰', sub: 'ثبت شده', color: '#10b981', icon: '🛒' },
  { label: 'درآمد ثبت‌شده', value: '۴۵۰,۰۰۰,۰۰۰ تومان', sub: 'ماه جاری', color: '#d97706', icon: '💰' },
  { label: 'در انتظار پرداخت', value: '۱۲', sub: 'پیش‌فاکتورها', color: '#f59e0b', icon: '⚠️' },
  { label: 'محصولات', value: '۱۴', sub: 'فعال در انبار', color: '#06b6d4', icon: '📦' },
  { label: 'مرجوعی در انتظار', value: '۰', sub: 'نیاز به بررسی', color: '#ef4444', icon: '🛡️' },
];

export const DashboardView: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f0f6fc', marginBottom: '20px' }}>
        داشبورد مدیریتی
      </h1>
      
      {/* بخش کارت‌های KPI */}
      <KPIGrid cards={sampleKPICards} />

      {/* بخش نمودارها */}
      <DashboardCharts />
    </div>
  );
};
