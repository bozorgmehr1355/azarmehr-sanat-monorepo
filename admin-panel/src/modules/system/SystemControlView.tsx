import React, { useCallback, useEffect, useState } from 'react';
import { resolveApiBase } from '../../config/api';
import { apiFetch } from '../../config/api';
import { Card, Loading, ErrorBox, PageHeader, RefreshButton, faNum, faDate, StatusBadge } from '../../shared/ui';

export const SystemControlView: React.FC = () => {
  const [apiBase, setApiBase] = useState(resolveApiBase());
  const [savedStatus, setSavedStatus] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [health, setHealth] = useState<string>('');

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const data = await apiFetch('/api/users');
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e: any) {
      setUsersError(e?.message || 'خطا در دریافت کاربران');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/health`, { method: 'GET' });
      const data = await res.json().catch(() => null);
      setHealth(data?.ok ? `✅ بک‌اند فعال — ${data.routes?.length || 0} مسیر` : `⚠️ پاسخ غیرمنتظره (${res.status})`);
    } catch {
      setHealth('❌ بک‌اند در دسترس نیست');
    }
  }, [apiBase]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleSave = () => {
    localStorage.setItem('AZARMEHR_API_BASE', apiBase);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
    window.location.reload();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#f0f6fc',
    direction: 'ltr',
    fontSize: 13,
    boxSizing: 'border-box',
  };

  return (
    <div>
      <PageHeader
        title="کنترل‌پنل جامع سیستم"
        subtitle="تنظیمات اتصال API و مدیریت کاربران"
        actions={<RefreshButton onClick={() => { loadUsers(); checkHealth(); }} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* تنظیمات API */}
        <Card>
          <h3 style={{ fontSize: 16, color: '#f59e0b', margin: '0 0 16px' }}>🌐 تنظیمات اتصال API</h3>
          <label style={{ display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 6 }}>
            آدرس بیس API (API Base URL):
          </label>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={handleSave}
            style={{
              backgroundColor: '#d97706',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              marginTop: 12,
            }}
          >
            ذخیره تغییرات API
          </button>
          {savedStatus && <span style={{ marginRight: 10, color: '#10b981', fontSize: 12 }}>✓ ذخیره شد — صفحه بازنشانی می‌شود</span>}
        </Card>

        {/* وضعیت سرویس‌ها */}
        <Card>
          <h3 style={{ fontSize: 16, color: '#3b82f6', margin: '0 0 16px' }}>🔌 وضعیت اتصال سرویس‌ها</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>
              <span>بک‌اند (azarmehr-backend):</span>
              <span style={{ color: health.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {health || 'در حال بررسی...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>
              <span>دیتابیس (Supabase):</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>از طریق API بک‌اند</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #21262d', paddingBottom: 8 }}>
              <span>کاربران متصل:</span>
              <span style={{ color: '#f0f6fc', fontWeight: 600 }}>{faNum(users.length)} کاربر</span>
            </div>
          </div>
          <button
            onClick={checkHealth}
            style={{
              background: '#21262d',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: 6,
              padding: '7px 14px',
              cursor: 'pointer',
              fontSize: 12,
              marginTop: 12,
            }}
          >
            بررسی مجدد سلامت
          </button>
        </Card>
      </div>

      {/* کاربران */}
      <h3 style={{ fontSize: 16, color: '#f0f6fc', margin: '0 0 12px' }}>👥 کاربران سیستم</h3>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {usersLoading ? (
          <Loading label="در حال دریافت کاربران..." />
        ) : usersError ? (
          <div style={{ padding: 16 }}>
            <ErrorBox message={usersError} onRetry={loadUsers} />
          </div>
        ) : users.length === 0 ? (
          <p style={{ padding: 24, color: '#8b949e', fontSize: 13 }}>کاربری یافت نشد.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
                  <th style={{ padding: '12px 10px' }}>نام</th>
                  <th style={{ padding: '12px 10px' }}>نام کاربری</th>
                  <th style={{ padding: '12px 10px' }}>نقش</th>
                  <th style={{ padding: '12px 10px' }}>سطح سیستم</th>
                  <th style={{ padding: '12px 10px' }}>دسترسی‌ها</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: '#f0f6fc' }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '12px 10px', direction: 'ltr', textAlign: 'right' }}>{u.username || '—'}</td>
                    <td style={{ padding: '12px 10px' }}>{u.role || '—'}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <StatusBadge status={u.system_role === 'super_admin' ? 'active' : u.system_role === 'admin' ? 'new' : u.system_role} />
                      <span style={{ marginRight: 6, fontSize: 12, color: '#8b949e' }}>{u.system_role || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 10px', color: '#8b949e', fontSize: 11 }}>
                      {(u.permissions || []).slice(0, 4).join(', ') || '—'}
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
