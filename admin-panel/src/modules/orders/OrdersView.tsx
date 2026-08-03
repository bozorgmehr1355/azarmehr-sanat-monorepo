import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import {
  Card, Loading, ErrorBox, PageHeader, RefreshButton, faNum, faMoney, StatusBadge,
  ORDER_STATUS_LABELS, faDate,
} from '../../shared/ui';
import { TaskBoard } from './TaskBoard';

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
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: '',
    order_type: channel === 'retail' ? 'retail' : channel === 'wholesale' ? 'wholesale' : 'wholesale',
    payment_type: 'cash',
    total_amount: '',
    note: '',
  });

  // دریافت لیست مشتریان برای فرم ثبت سفارش
  const loadCustomers = useCallback(async () => {
    try {
      const data = await apiFetch('/api/crm-customers?limit=500');
      setCustomers(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const submitOrder = async () => {
    setSaving(true);
    setFormMsg('');
    try {
      if (!form.customer_id) {
        setFormMsg('✗ انتخاب مشتری الزامی است');
        setSaving(false);
        return;
      }
      const body: any = {
        customer_id: Number(form.customer_id),
        order_type: form.order_type,
        sales_channel: form.order_type,
        payment_type: form.payment_type || 'cash',
        note: form.note || undefined,
      };
      if (form.total_amount) body.total_amount = Number(form.total_amount);
      await apiFetch('/api/crm-orders', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setFormMsg('✓ سفارش با موفقیت ثبت شد');
      setShowForm(false);
      setForm({ ...form, customer_id: '', total_amount: '', note: '' });
      load();
    } catch (e: any) {
      setFormMsg(`✗ ${e?.message || 'خطا در ثبت سفارش'}`);
    } finally {
      setSaving(false);
    }
  };

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
          (o.tracking_code || o.order_no || '').includes(q) ||
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
        actions={
          <>
            <button
              onClick={() => setShowForm((s) => !s)}
              style={{
                background: '#238636',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {showForm ? 'بستن فرم' : '+ سفارش جدید'}
            </button>
            <RefreshButton onClick={load} />
          </>
        }
      />

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', color: '#f0f6fc', fontSize: 15 }}>ثبت سفارش جدید</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>مشتری *</div>
              <select
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">انتخاب مشتری...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || '—'} {c.phone ? `(${faNum(c.phone)})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>نوع سفارش</div>
              <select
                value={form.order_type}
                onChange={(e) => setForm({ ...form, order_type: e.target.value })}
                style={inputStyle}
              >
                <option value="wholesale">عمده‌فروشی</option>
                <option value="retail">خرده‌فروشی</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>نوع پرداخت</div>
              <select
                value={form.payment_type}
                onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
                style={inputStyle}
              >
                <option value="cash">نقدی</option>
                <option value="credit">اعتباری</option>
                <option value="mixed">ترکیبی</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>مبلغ کل (تومان)</div>
              <input
                placeholder="اختیاری"
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>توضیحات</div>
              <input
                placeholder="اختیاری"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={submitOrder}
              disabled={saving}
              style={{
                background: saving ? '#2a5a35' : '#238636',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 20px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {saving ? 'در حال ثبت...' : 'ثبت سفارش'}
            </button>
            {formMsg && <span style={{ fontSize: 13, color: formMsg.startsWith('✓') ? '#3fb950' : '#f85149' }}>{formMsg}</span>}
          </div>
          {form.order_type === 'retail' && (
            <p style={{ fontSize: 12, color: '#8b949e', margin: '10px 0 0' }}>
              سفارش خرده‌فروشی مستقیماً به فاکتور نهایی تبدیل می‌شود (بدون پروژه و مراحل کاری).
            </p>
          )}
        </Card>
      )}

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
                    <th style={{ padding: '12px 10px' }}>نوع</th>
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
                        {o.tracking_code || o.order_no || `#${o.id}`}
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
                        {(o.order_type || o.sales_channel || '') === 'retail' ? 'خرده' : 'عمده'}
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

  const isRetail = (order.order_type || order.sales_channel) === 'retail';
  const isFinalized = isRetail
    ? converted || (order.order_status || '') === 'proforma_issued'
    : converted;

  const convertToProject = async () => {
    setConverting(true);
    setConvertMsg(null);
    try {
      const data = await apiFetch('/api/crm-order-to-project', {
        method: 'POST',
        body: JSON.stringify({ order_id: order.id }),
      });

      setConverted(true);

      if (data?.mode === 'retail') {
        setConvertMsg({
          type: 'ok',
          text: `فاکتور نهایی «${data.invoice_number || '—'}» برای این سفارش صادر شد (مسیر خرده‌فروشی).`,
        });
      } else {
        // Wholesale path — use the new response contract
        const projectTitle = data?.project?.title || 'پروژه';
        const stages = data?.total_stages ?? data?.tasks?.length ?? 8;

        const parts: string[] = [];

        if (data?.projectCreated) {
          parts.push(`پروژه «${projectTitle}» ایجاد شد`);
        } else if (data?.projectAlreadyExists) {
          parts.push(`پروژه قبلاً وجود داشت`);
        }

        if (data?.orderWorkflowCreated) {
          parts.push(`${stages} مرحله کاری ایجاد شد`);
        } else if (data?.orderWorkflowSkipped) {
          parts.push(`مراحل کاری از قبل وجود داشت`);
        }

        const msg = parts.length > 0 ? parts.join(' — ') : 'تبدیل سفارش به پروژه انجام شد';

        setConvertMsg({
          type: 'ok',
          text: msg,
        });
      }

      // Show warnings if any
      if (data?.warnings && data.warnings.length > 0) {
        data.warnings.forEach((w: string, i: number) => {
          setTimeout(() => {
            setConvertMsg({ type: 'info', text: `هشدار: ${w}` });
          }, i * 500);
        });
      }
    } catch (e: any) {
      if (e?.status === 400) {
        setConvertMsg({
          type: 'err',
          text: e?.message || 'ورودی نامعتبر است',
        });
      } else if (e?.status === 404) {
        setConvertMsg({
          type: 'err',
          text: e?.message || 'سفارش پیدا نشد',
        });
      } else if (e?.status === 409) {
        setConvertMsg({
          type: 'info',
          text: e?.message || 'برای این سفارش قبلاً پروژه ایجاد شده است',
        });
      } else {
        setConvertMsg({ type: 'err', text: e?.message || 'خطا در تبدیل سفارش' });
      }
    } finally {
      setConverting(false);
    }
  };

  return (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <h3 style={{ margin: 0, color: '#f0f6fc', fontSize: 17 }}>
        {order.tracking_code || order.order_no || `سفارش #${order.id}`}
      </h3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={convertToProject}
          disabled={converting || isFinalized}
          title={isRetail ? 'صدور فاکتور نهایی برای این سفارش خرده‌فروشی' : 'ایجاد پروژه و ۸ مرحله کاری برای این سفارش'}
          style={{
            background: converting || isFinalized ? '#2a4a75' : '#1f6feb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '7px 16px',
            cursor: converting || isFinalized ? 'default' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {converting
            ? 'در حال انجام...'
            : isFinalized
              ? (isRetail ? 'فاکتور صادر شد ✓' : 'تبدیل شد ✓')
              : (isRetail ? 'صدور فاکتور نهایی' : 'تبدیل به پروژه')}
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
      <Field label="نوع سفارش" value={(order.order_type || order.sales_channel || '—') === 'retail' ? 'خرده‌فروشی' : (order.order_type || order.sales_channel || '—') === 'wholesale' ? 'عمده‌فروشی' : (order.order_type || order.sales_channel || '—')} />
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

    {!isRetail && (
      <TaskBoard orderId={order.id} />
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

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: 8,
  color: '#f0f6fc',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
};
