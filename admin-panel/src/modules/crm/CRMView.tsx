import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import {
  Card, Loading, ErrorBox, PageHeader, RefreshButton, faNum, StatusBadge, faDate,
} from '../../shared/ui';

export const CRMView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    customer_type: 'wholesale',
    grade: 'standard',
    customer_status: 'new',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ limit: '500' });
      if (search.trim()) q.set('search', search.trim());
      const data = await apiFetch(`/api/crm-customers?${q.toString()}`);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت مشتریان');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    setFormMsg('');
    try {
      await apiFetch('/api/crm-customers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setFormMsg('✓ مشتری با موفقیت ثبت شد');
      setShowForm(false);
      load();
    } catch (e: any) {
      setFormMsg(`✗ ${e?.message || 'خطا در ثبت مشتری'}`);
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) return <Loading label="در حال دریافت مشتریان..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="مدیریت مشتریان (CRM)"
        subtitle="لیست زنده مشتریان عمده و خرده از دیتابیس"
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
              {showForm ? 'بستن فرم' : '+ افزودن مشتری'}
            </button>
            <RefreshButton onClick={load} />
          </>
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="جستجوی نام / تلفن / فروشگاه..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 360 }}
        />
        <span style={{ color: '#8b949e', fontSize: 12, alignSelf: 'center' }}>{faNum(customers.length)} مشتری</span>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', color: '#f0f6fc', fontSize: 15 }}>مشتری جدید</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <input placeholder="نام مشتری *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            <input placeholder="تلفن" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            <input placeholder="شهر" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
            <select value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })} style={inputStyle}>
              <option value="wholesale">عمده</option>
              <option value="retail">خرده</option>
            </select>
            <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} style={inputStyle}>
              <option value="standard">معمولی</option>
              <option value="silver">نقره‌ای</option>
              <option value="gold">طلایی</option>
              <option value="vip">VIP</option>
            </select>
            <select value={form.customer_status} onChange={(e) => setForm({ ...form, customer_status: e.target.value })} style={inputStyle}>
              <option value="new">جدید</option>
              <option value="active">فعال</option>
              <option value="suspended">مسدود</option>
            </select>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={submit}
              disabled={saving || !form.name.trim()}
              style={{
                background: saving || !form.name.trim() ? '#2a5a35' : '#238636',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 20px',
                cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {saving ? 'در حال ثبت...' : 'ثبت مشتری'}
            </button>
            {formMsg && <span style={{ fontSize: 13, color: formMsg.startsWith('✓') ? '#3fb950' : '#f85149' }}>{formMsg}</span>}
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {customers.length === 0 ? (
          <p style={{ padding: 32, color: '#8b949e', fontSize: 13, textAlign: 'center' }}>مشتری‌ای یافت نشد.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
                  <th style={{ padding: '12px 10px' }}>کد مشتری</th>
                  <th style={{ padding: '12px 10px' }}>نام</th>
                  <th style={{ padding: '12px 10px' }}>تلفن</th>
                  <th style={{ padding: '12px 10px' }}>شهر</th>
                  <th style={{ padding: '12px 10px' }}>نوع</th>
                  <th style={{ padding: '12px 10px' }}>گرید</th>
                  <th style={{ padding: '12px 10px' }}>وضعیت</th>
                  <th style={{ padding: '12px 10px' }}>کل سفارشات</th>
                  <th style={{ padding: '12px 10px' }}>تاریخ عضویت</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: '#58a6ff' }}>{c.customer_code || `#${c.id}`}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: '#f0f6fc' }}>{c.name || '—'}</td>
                    <td style={{ padding: '12px 10px', direction: 'ltr', textAlign: 'right' }}>{faNum(c.phone || c.mobile || '—')}</td>
                    <td style={{ padding: '12px 10px' }}>{c.city || '—'}</td>
                    <td style={{ padding: '12px 10px', color: '#8b949e' }}>
                      {(c.customer_type || c.type || c.sales_segment) === 'retail' ? 'خرده' : 'عمده'}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#8b949e' }}>{c.grade || '—'}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <StatusBadge status={c.customer_status || c.status} />
                    </td>
                    <td style={{ padding: '12px 10px' }}>{faNum(c.total_orders ?? '—')}</td>
                    <td style={{ padding: '12px 10px', color: '#8b949e' }}>{faDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
