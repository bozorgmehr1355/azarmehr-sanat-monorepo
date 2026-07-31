import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import {
  Card, Loading, ErrorBox, PageHeader, RefreshButton, faNum, faMoney, StatusBadge,
  ORDER_STATUS_LABELS, faDate,
} from '../../shared/ui';

interface OrdersViewProps {
  channel?: 'wholesale' | 'retail';
  title?: string;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ channel, title }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [details, setDetails] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ limit: '500' });
      if (statusFilter) query.set('status', statusFilter);
      const data = await apiFetch(`/api/crm-orders?${query.toString()}`);
      let list = Array.isArray(data) ? data : [];
      if (channel) list = list.filter((o) => (o.sales_channel || 'wholesale') === channel);
      if (search.trim()) {
        const q = search.trim();
        list = list.filter((o) =>
          (o.order_no || '').includes(q) ||
          (o.crm_customers?.name || o.customer_name || '').includes(q) ||
          (o.customer_phone || '').includes(q)
        );
      }
      setOrders(list);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت سفارشات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channel, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetails = async (order: any) => {
    setDetails(order);
    try {
      const items = await apiFetch(`/api/crm-order-items?order_id=eq.${order.id}`);
      setDetails({ ...order, items: Array.isArray(items) ? items : [] });
    } catch {
      setDetails(order);
    }
  };

  if (loading) return <Loading label="در حال دریافت سفارشات..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title={title || 'مدیریت سفارشات'}
        subtitle={channel ? `سفارش‌های کانال ${channel === 'wholesale' ? 'عمده‌فروشی' : 'خرده‌فروشی'}` : 'لیست زنده سفارشات از دیتابیس'}
        actions={<RefreshButton onClick={load} />}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="جستجوی مشتری / شماره سفارش / تلفن..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            padding: '9px 14px',
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: 8,
            color: '#f0f6fc',
            fontSize: 13,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '9px 12px',
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: 8,
            color: '#f0f6fc',
            fontSize: 13,
          }}
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {details ? (
        <OrderDetails order={details} onBack={() => setDetails(null)} />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {orders.length === 0 ? (
            <p style={{ padding: 32, color: '#8b949e', fontSize: 13, textAlign: 'center' }}>سفارشی یافت نشد.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
                    <th style={{ padding: '12px 10px' }}>شماره</th>
                    <th style={{ padding: '12px 10px' }}>مشتری</th>
                    <th style={{ padding: '12px 10px' }}>مبلغ کل</th>
                    <th style={{ padding: '12px 10px' }}>وضعیت</th>
                    <th style={{ padding: '12px 10px' }}>کانال</th>
                    <th style={{ padding: '12px 10px' }}>تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => openDetails(o)}
                      style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#1c2129')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: '#f0f6fc' }}>
                        {o.order_no || `#${o.id}`}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {o.crm_customers?.name || o.customer_name || '—'}
                        {o.crm_customers?.phone && (
                          <div style={{ fontSize: 11, color: '#8b949e', direction: 'ltr', textAlign: 'right' }}>
                            {faNum(o.crm_customers.phone)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px' }}>{faMoney(o.total_amount || o.amount)}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <StatusBadge status={o.order_status || o.status} />
                      </td>
                      <td style={{ padding: '12px 10px', color: '#8b949e' }}>
                        {(o.sales_channel || '') === 'retail' ? 'خرده' : 'عمده'}
                      </td>
                      <td style={{ padding: '12px 10px', color: '#8b949e' }}>{faDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

const OrderDetails: React.FC<{ order: any; onBack: () => void }> = ({ order, onBack }) => {
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState(false);
  const [convertMsg, setConvertMsg] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);

  const convertToProject = async () => {
    setConverting(true);
    setConvertMsg(null);
    try {
      const data = await apiFetch('/api/crm-order-to-project', {
        method: 'POST',
        body: JSON.stringify({ order_id: order.id }),
      });
      setConverted(true);
      const projectTitle = data?.project?.title || 'پروژه';
      const stages = data?.total_stages ?? data?.tasks?.length ?? 8;
      setConvertMsg({
        type: 'ok',
        text: `پروژه «${projectTitle}» با ${stages} مرحله کاری ایجاد شد.`,
      });
    } catch (e: any) {
      if (e?.status === 409) {
        setConvertMsg({
          type: 'info',
          text: e?.message || 'برای این سفارش قبلاً پروژه / مراحل کاری ایجاد شده است.',
        });
      } else {
        setConvertMsg({ type: 'err', text: e?.message || 'خطا در تبدیل سفارش به پروژه' });
      }
    } finally {
      setConverting(false);
    }
  };

  return (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <h3 style={{ margin: 0, color: '#f0f6fc', fontSize: 17 }}>
        {order.order_no || `سفارش #${order.id}`}
      </h3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={convertToProject}
          disabled={converting || converted}
          title="ایجاد پروژه و ۸ مرحله کاری برای این سفارش"
          style={{
            background: converting || converted ? '#2a4a75' : '#1f6feb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '7px 16px',
            cursor: converting || converted ? 'default' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {converting ? 'در حال تبدیل...' : converted ? 'تبدیل شد ✓' : 'تبدیل به پروژه'}
        </button>
        <button
          onClick={onBack}
          style={{
            background: '#21262d',
            color: '#c9d1d9',
            border: '1px solid #30363d',
            borderRadius: 8,
            padding: '7px 14px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← بازگشت
        </button>
      </div>
    </div>

    {convertMsg && (
      <div
        style={{
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 13,
          background: convertMsg.type === 'ok' ? '#12261a' : convertMsg.type === 'info' ? '#1c2129' : '#2d1517',
          color: convertMsg.type === 'ok' ? '#3fb950' : convertMsg.type === 'info' ? '#c9d1d9' : '#f85149',
          border: `1px solid ${convertMsg.type === 'ok' ? '#238636' : convertMsg.type === 'info' ? '#30363d' : '#da3633'}`,
        }}
      >
        {convertMsg.text}
      </div>
    )}


    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
      <Field label="مشتری" value={order.crm_customers?.name || order.customer_name || '—'} />
      <Field label="تلفن" value={order.customer_phone || order.crm_customers?.phone || '—'} />
      <Field label="وضعیت" value={<StatusBadge status={order.order_status || order.status} />} />
      <Field label="مبلغ کل" value={faMoney(order.total_amount || order.amount) + ' تومان'} />
      <Field label="کانال فروش" value={(order.sales_channel || '—') === 'retail' ? 'خرده‌فروشی' : order.sales_channel === 'wholesale' ? 'عمده‌فروشی' : order.sales_channel} />
      <Field label="نوع پرداخت" value={order.payment_type || '—'} />
      <Field label="تاریخ ثبت" value={faDate(order.created_at)} />
      <Field label="توضیحات" value={order.note || order.description || '—'} />
    </div>

    {order.items && order.items.length > 0 && (
      <>
        <h4 style={{ color: '#f0f6fc', fontSize: 14, margin: '0 0 10px' }}>اقلام سفارش</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
              <th style={{ padding: '8px' }}>محصول</th>
              <th style={{ padding: '8px' }}>تعداد</th>
              <th style={{ padding: '8px' }}>واحد</th>
              <th style={{ padding: '8px' }}>قیمت واحد</th>
              <th style={{ padding: '8px' }}>جمع</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it: any, idx: number) => (
              <tr key={it.id || idx} style={{ borderBottom: '1px solid #21262d' }}>
                <td style={{ padding: '8px' }}>{it.item_name || it.product_name || it.product || '—'}</td>
                <td style={{ padding: '8px' }}>{faNum(it.quantity ?? it.qty ?? '—')}</td>
                <td style={{ padding: '8px' }}>{it.unit || '—'}</td>
                <td style={{ padding: '8px' }}>{faMoney(it.unit_price)}</td>
                <td style={{ padding: '8px' }}>{faMoney(it.line_total ?? it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}
  </Card>
  );
};

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: '10px 14px' }}>
    <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 13, color: '#f0f6fc' }}>{value}</div>
  </div>
);
