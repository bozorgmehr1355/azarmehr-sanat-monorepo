import React, { useState } from 'react';
import { DashboardView } from '../modules/dashboard/DashboardView';
import { SystemControlView } from '../modules/system/SystemControlView';

export interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: '📊' },
    { id: 'orders', label: 'سفارشات', icon: '🛒' },
    { id: 'crm', label: 'مشتریان', icon: '👥' },
    { id: 'whatsapp', label: 'واتساپ', icon: '💬' },
    { id: 'tankhah', label: 'تنخواهیار', icon: '💳' },
    { id: 'system', label: 'کنترل‌پنل جامع', icon: '⚙️' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0d1117', color: '#f0f6fc' }}>
      {/* Header */}
      <header
        style={{
          height: '60px',
          borderBottom: '1px solid #30363d',
          backgroundColor: '#161b22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#d97706' }}>آذرمهر صنعت</span>
          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#30363d', color: '#8b949e' }}>
            پنل مدیریت
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('system')}
            style={{
              backgroundColor: activeTab === 'system' ? '#d97706' : '#21262d',
              border: '1px solid #30363d',
              color: '#f0f6fc',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ⚙️ تنظیمات سیستم
          </button>
        </div>
      </header>

      {/* Main Container with Navigation */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Sidebar Navigation */}
        <aside
          style={{
            width: '220px',
            backgroundColor: '#161b22',
            borderLeft: '1px solid #30363d',
            padding: '16px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
          className="desktop-sidebar"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? '#d977061f' : 'transparent',
                  color: isActive ? '#f59e0b' : '#8b949e',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  width: '100%',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1, backgroundColor: '#0d1117', overflowY: 'auto', paddingBottom: '70px' }}>
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'system' && <SystemControlView />}
          {activeTab !== 'dashboard' && activeTab !== 'system' && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
              <h2>ماژول {navItems.find((i) => i.id === activeTab)?.label}</h2>
              <p>این بخش در حال انتقال به ساختار ماژولار است...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
