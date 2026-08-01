import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import { Card, Loading, ErrorBox, PageHeader, RefreshButton, StatusBadge, faNum, faMoney } from '../../shared/ui';

interface Product {
  id: number;
  name?: string;
  code?: string;
  category?: string;
  packaging?: string;
  package_size?: string;
  base_price?: number | string;
  price_standard?: number | string;
  price_silver?: number | string;
  price_gold?: number | string;
  price_vip?: number | string;
  quantity_in_carton?: number;
  stock?: number;
  has_guarantee?: boolean;
  guarantee_days?: number;
  active?: boolean;
  description?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: 6,
  color: '#f0f6fc',
  fontSize: 13,
  boxSizing: 'border-box',
};

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', base_price: '', stock: '' });
  const [formMsg, setFormMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت محصولات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = products.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = [p.name, p.code, p.category, p.packaging].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });

  const submit = async () => {
    if (!form.name.trim()) {
      setFormMsg('✗ نام محصول الزامی است');
      return;
    }
    setFormMsg('');
    try {
      await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          base_price: Number(form.base_price) || 0,
          stock: Number(form.stock) || 0,
        }),
      });
      setForm({ name: '', base_price: '', stock: '' });
      setShowForm(false);
      setFormMsg('✓ محصول با موفقیت ثبت شد');
      load();
    } catch (e: any) {
      setFormMsg(`✗ ${e?.message || 'خطا در ثبت محصول'}`);
    }
  };

  const tierPrices = (p: Product): string[] => {
    const tiers: Array<[string, any]> = [
      ['استاندارد', p.price_standard],
      ['نقره‌ای', p.price_silver],
      ['طلایی', p.price_gold],
      ['VIP', p.price_vip],
    ];
    return tiers
      .filter(([, v]) => Number(v) > 0)
      .map(([label, v]) => `${label}: ${faNum(Number(v).toLocaleString('en-US'))}`);
  };

  if (loading) return <Loading label="در حال دریافت محصولات..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="مدیریت محصولات"
        subtitle="فهرست محصولات (جدول products — منبع داده: دیتابیس زنده)"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowForm((v) => !v)}
              style={{
                backgroundColor: '#21262d',
                color: '#c9d1d9',
                border: '1px solid #30363d',
                borderRadius: 6,
                padding: '7px 14px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {showForm ? 'بستن فرم' : '+ ثبت محصول جدید'}
            </button>
            <RefreshButton onClick={load} />
          </div>
        }
      />

      {formMsg && (
        <div style={{ marginBottom: 12, fontSize: 13, color: formMsg.startsWith('✓') ? '#3fb950' : '#f85149' }}>
          {formMsg}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 6 }}>نام محصول *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={inputStyle}
                placeholder="مثلاً چای شکسته زرین ۵۰۰ گرمی"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 6 }}>قیمت پایه (تومان)</label>
              <input
                type="number"
                value={form.base_price}
                onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
                style={inputStyle}
                placeholder="۰"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 6 }}>موجودی</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                style={inputStyle}
                placeholder="۰"
              />
            </div>
          </div>
          <button
            onClick={submit}
            style={{
              backgroundColor: '#d97706',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              marginTop: 12,
              fontSize: 13,
            }}
          >
            ذخیره محصول
          </button>
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ color: '#8b949e', fontSize: 12 }}>{faNum(filtered.length)} محصول</div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی نام / کد / دسته / بسته‌بندی..."
          style={{ ...inputStyle, width: 260, maxWidth: '100%' }}
        />
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 24, color: '#8b949e', fontSize: 13 }}>
            {products.length === 0 ? 'محصولی ثبت نشده است.' : 'محصولی مطابق جستجو پیدا نشد.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
                  <th style={{ padding: '12px 10px' }}>محصول</th>
                  <th style={{ padding: '12px 10px' }}>دسته / بسته‌بندی</th>
                  <th style={{ padding: '12px 10px' }}>قیمت پایه</th>
                  <th style={{ padding: '12px 10px' }}>قیمت سطوح</th>
                  <th style={{ padding: '12px 10px' }}>موجودی</th>
                  <th style={{ padding: '12px 10px' }}>گارانتی</th>
                  <th style={{ padding: '12px 10px' }}>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: 600, color: '#f0f6fc' }}>{p.name || '—'}</div>
                      {p.code && (
                        <div style={{ fontSize: 11, color: '#8b949e', direction: 'ltr', textAlign: 'right' }}>{p.code}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#c9d1d9' }}>
                      {p.category || '—'}
                      {(p.packaging || p.package_size) && (
                        <div style={{ fontSize: 11, color: '#8b949e' }}>
                          {[p.packaging, p.package_size].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#f0f6fc', fontWeight: 600 }}>{faMoney(p.base_price)}</td>
                    <td style={{ padding: '12px 10px', color: '#8b949e', fontSize: 11 }}>
                      {tierPrices(p).length > 0 ? tierPrices(p).join(' | ') : '—'}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#c9d1d9' }}>
                      {faNum(p.stock)}
                      {Number(p.quantity_in_carton) > 0 && (
                        <div style={{ fontSize: 11, color: '#8b949e' }}>{faNum(p.quantity_in_carton)} عدد در کارتن</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      {p.has_guarantee ? (
                        <span style={{ color: '#06b6d4', fontSize: 12 }}>
                          {faNum(p.guarantee_days)} روزه
                        </span>
                      ) : (
                        <span style={{ color: '#8b949e', fontSize: 12 }}>ندارد</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <StatusBadge status={p.active === false ? 'suspended' : 'active'} />
                    </td>
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
