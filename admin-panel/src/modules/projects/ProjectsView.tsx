import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import {
  Card, Loading, ErrorBox, PageHeader, RefreshButton, faNum, StatusBadge, faDate,
} from '../../shared/ui';

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [form, setForm] = useState({ title: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/projects');
      setProjects(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت پروژه‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    setFormMsg('');
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: form.title.trim(), description: form.description.trim() }),
      });
      setFormMsg('✓ پروژه با موفقیت ایجاد شد');
      setForm({ title: '', description: '' });
      setShowForm(false);
      load();
    } catch (e: any) {
      setFormMsg(`✗ ${e?.message || 'خطا در ایجاد پروژه'}`);
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

  if (loading) return <Loading label="در حال دریافت پروژه‌ها..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="پروژه‌ها"
        subtitle="پروژه‌های مرتبط با سفارشات (از جدول projects)"
        actions={
          <>
            <button
              onClick={() => setShowForm((s) => !s)}
              style={{
                background: '#1f6feb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {showForm ? 'بستن فرم' : '+ پروژه جدید'}
            </button>
            <RefreshButton onClick={load} />
          </>
        }
      />

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 14px', color: '#f0f6fc', fontSize: 15 }}>پروژه جدید</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <input placeholder="عنوان پروژه *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
            <input placeholder="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={submit}
              disabled={saving || !form.title.trim()}
              style={{
                background: saving || !form.title.trim() ? '#2a4a75' : '#1f6feb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 20px',
                cursor: saving || !form.title.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {saving ? 'در حال ایجاد...' : 'ایجاد پروژه'}
            </button>
            {formMsg && <span style={{ fontSize: 13, color: formMsg.startsWith('✓') ? '#3fb950' : '#f85149' }}>{formMsg}</span>}
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {projects.length === 0 ? (
          <p style={{ padding: 32, color: '#8b949e', fontSize: 13, textAlign: 'center' }}>پروژه‌ای یافت نشد.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
                  <th style={{ padding: '12px 10px' }}>عنوان</th>
                  <th style={{ padding: '12px 10px' }}>توضیحات</th>
                  <th style={{ padding: '12px 10px' }}>سفارش مرتبط</th>
                  <th style={{ padding: '12px 10px' }}>وضعیت</th>
                  <th style={{ padding: '12px 10px' }}>تاریخ ایجاد</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: '#f0f6fc' }}>{p.title || '—'}</td>
                    <td style={{ padding: '12px 10px', color: '#8b949e' }}>{p.description || '—'}</td>
                    <td style={{ padding: '12px 10px' }}>{p.order_id ? faNum(p.order_id) : '—'}</td>
                    <td style={{ padding: '12px 10px' }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: '12px 10px', color: '#8b949e' }}>{faDate(p.created_at)}</td>
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
