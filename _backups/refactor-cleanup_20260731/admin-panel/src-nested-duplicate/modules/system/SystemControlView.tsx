import React, { useState } from 'react';
import { resolveApiBase } from '../../config/api';

export const SystemControlView: React.FC = () => {
  const [apiBase, setApiBase] = useState(resolveApiBase());
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = () => {
    localStorage.setItem('AZARMEHR_API_BASE', apiBase);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f0f6fc', marginBottom: '8px' }}>
        ⚙️ کنترل‌پنل جامع سیستم
      </h1>
      <p style={{ fontSize: '13px', color: '#8b949e', marginBottom: '24px' }}>
        مدیریت متمرکز تنظیمات صفر تا صد اپلیکیشن، سرویس‌های متصل و دیتابیس
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* کارت تنظیمات API & Backend */}
        <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: '#f59e0b', marginBottom: '16px' }}>🌐 تنظیمات اتصال API</h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>
              آدرس بیس API (API Base URL):
            </label>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#f0f6fc',
                direction: 'ltr',
                fontSize: '13px',
              }}
            />
          </div>
          <button
            onClick={handleSave}
            style={{
              backgroundColor: '#d97706',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ذخیره تغییرات API
          </button>
          {savedStatus && <span style={{ marginRight: '10px', color: '#10b981', fontSize: '12px' }}>✓ ذخیره شد</span>}
        </div>

        {/* کارت وضعیت سرویس‌ها */}
        <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: '#3b82f6', marginBottom: '16px' }}>🔌 وضعیت اتصال سرویس‌ها</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #21262d', paddingBottom: '8px' }}>
              <span>دیتابیس Supabase:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>متصل (Active)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #21262d', paddingBottom: '8px' }}>
              <span>آداپتور واتساپ (WhatsApp Broadcast):</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>آماده به کار</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #21262d', paddingBottom: '8px' }}>
              <span>آداپتور بله (Bale Adapter):</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>فعال</span>
            </div>
          </div>
        </div>

        {/* کارت حالت توسعه و لاگ‌ها */}
        <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: '#10b981', marginBottom: '16px' }}>🛠️ وضعیت محیط اجرا</h3>
          <div style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.8' }}>
            <div>محیط فعلی: <strong style={{ color: '#f0f6fc' }}>Vercel Static / Production</strong></div>
            <div>معماری: <strong style={{ color: '#f0f6fc' }}>Modular Monorepo Architecture</strong></div>
            <div>آنالیتیکس: <strong style={{ color: '#ef4444' }}>Disabled (طبق قوانین توسعه)</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
