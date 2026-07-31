import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import { Card, Loading, ErrorBox, PageHeader, RefreshButton, faNum, faMoney, StatusBadge } from '../../shared/ui';

interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  color: string;
  icon: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, subtext, color, icon }) => (
  <div
    style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#8b949e' }}>{label}</span>
      <span style={{ fontSize: 20 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 12, color: '#8b949e' }}>{subtext}</div>
  </div>
);

export const DashboardView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    customers: 0,
    customersWholesale: 0,
    customersRetail: 0,
    orders: 0,
    ordersPending: 0,
    ordersRegistered: 0,
    revenue: 0,
    guaranteeClaims: 0,
    guaranteePending: 0,
    paymentsPending: 0,
    recentOrders: [] as any[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [customers, orders, claims, payments] = await Promise.all([
        apiFetch('/api/crm-customers?limit=500'),
        apiFetch('/api/crm-orders?limit=500'),
        apiFetch('/api/crm-guarantee-claims?limit=500').catch(() => []),
        apiFetch('/api/crm-payments').catch(() => []),
      ]);

      const customersArr = Array.isArray(customers) ? customers : [];
      const ordersArr = Array.isArray(orders) ? orders : [];
      const claimsArr = Array.isArray(claims) ? claims : [];
      const paymentsArr = Array.isArray(payments) ? payments : [];

      const revenue = ordersArr.reduce((s, o) => s + (Number(o.total_amount) || Number(o.amount) || 0), 0);

      setStats({
        customers: customersArr.length,
        customersWholesale: customersArr.filter((c) => (c.customer_type || c.type || c.sales_segment) === 'wholesale' || c.customer_type === 'wholesale').length,
        customersRetail: customersArr.filter((c) => c.customer_type === 'retail').length,
        orders: ordersArr.length,
        ordersPending: ordersArr.filter((o) => ['registered', 'pending_review'].includes(o.order_status || o.status)).length,
        ordersRegistered: ordersArr.filter((o) => (o.order_status || o.status) === 'registered').length,
        revenue,
        guaranteeClaims: claimsArr.length,
        guaranteePending: claimsArr.filter((c) => (c.status || '').toLowerCase() === 'pending').length,
        paymentsPending: paymentsArr.filter((p) => {
          const s = String(p.status || '').toLowerCase();
          return !['ok', 'approved', 'verified', 'confirmed', 'done', 'paid'].includes(s) && !p.verified;
        }).length,
        recentOrders: ordersArr.slice(0, 8),
      });
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت داده‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="در حال دریافت داده‌های واقعی..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد مدیریتی"
        subtitle="آمار زنده از دیتابیس (سوپابیس) — به‌روزرسانی دستی با دکمه تازه‌سازی"
        actions={<RefreshButton onClick={load} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KpiCard icon="👥" label="کل مشتریان" value={faNum(stats.customers)} subtext={`عمده: ${faNum(stats.customersWholesale)} | خرده: ${faNum(stats.customersRetail)}`} color="#3b82f6" />
        <KpiCard icon="🛒" label="کل سفارشات" value={faNum(stats.orders)} subtext={`در انتظار بررسی: ${faNum(stats.ordersPending)}`} color="#10b981" />
        <KpiCard icon="💰" label="ارزش کل سفارشات" value={faMoney(stats.revenue) + ' تومان'} subtext="مجموع total_amount سفارشات" color="#d97706" />
        <KpiCard icon="⚠️" label="پرداخت‌های در انتظار" value={faNum(stats.paymentsPending)} subtext="نیاز به بررسی و تأیید" color="#f59e0b" />
        <KpiCard icon="🛡️" label="ادعاهای گارانتی" value={faNum(stats.guaranteeClaims)} subtext={`در انتظار: ${faNum(stats.guaranteePending)}`} color="#06b6d4" />
        <KpiCard icon="📦" label="سفارشات تازه" value={faNum(stats.ordersRegistered)} subtext="با وضعیت ثبت‌شده" color="#8b5cf6" />
      </div>

      <Card>
        <h3 style={{ fontSize: 16, color: '#f0f6fc', margin: '0 0 16px', fontWeight: 700 }}>🕘 آخرین سفارشات</h3>
        {stats.recentOrders.length === 0 ? (
          <p style={{ color: '#8b949e', fontSize: 13 }}>سفارشی ثبت نشده است.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
                <th style={{ padding: '10px 8px' }}>سفارش</th>
                <th style={{ padding: '10px 8px' }}>مشتری</th>
                <th style={{ padding: '10px 8px' }}>مبلغ</th>
                <th style={{ padding: '10px 8px' }}>وضعیت</th>
                <th style={{ padding: '10px 8px' }}>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: '#f0f6fc' }}>
                    {o.order_no || `#${o.id}`}
                  </td>
                  <td style={{ padding: '10px 8px' }}>{o.crm_customers?.name || o.customer_name || '—'}</td>
                  <td style={{ padding: '10px 8px' }}>{faMoney(o.total_amount || o.amount)}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <StatusBadge status={o.order_status || o.status} />
                  </td>
                  <td style={{ padding: '10px 8px', color: '#8b949e' }}>
                    {faNum(new Date(o.created_at).toLocaleDateString('fa-IR'))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
