import React, { useEffect, useState } from 'react';
import { Layout } from './shared/Layout';
import { getStoredUser, logout } from './config/api';
import { LoginScreen } from './modules/LoginScreen';
import { DashboardView } from './modules/dashboard/DashboardView';
import { OrdersView } from './modules/orders/OrdersView';
import { CRMView } from './modules/crm/CRMView';
import { MessengerView } from './modules/messenger/MessengerView';
import { SystemControlView } from './modules/system/SystemControlView';
import { WarrantyView } from './modules/warranty/WarrantyView';
import { FinanceView } from './modules/finance/FinanceView';
import { ProjectsView } from './modules/projects/ProjectsView';

// ماژول‌هایی که endpoint فعال روی بک‌اند دپلوی‌شده ندارند
const ComingSoon: React.FC<{ title: string; note?: string }> = ({ title, note }) => (
  <div style={{ padding: '24px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f0f6fc', marginBottom: '8px' }}>{title}</h2>
    <p style={{ fontSize: '13px', color: '#8b949e' }}>
      {note || 'این ماژول هنوز به بک‌اند متصل نشده است (endpoint آن روی سرور دپلوی نشده).'}
    </p>
  </div>
);

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(() => getStoredUser());
  const [activeTab, setActiveTab] = useState('dashboard');

  // خروج خودکار هنگام نامعتبر شدن توکن یا درخواست خروج
  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    const handleLogout = () => setUser(null);
    window.addEventListener('az:unauthorized', handleUnauthorized);
    window.addEventListener('az:logout', handleLogout);
    return () => {
      window.removeEventListener('az:unauthorized', handleUnauthorized);
      window.removeEventListener('az:logout', handleLogout);
    };
  }, []);

  if (!user) {
    return <LoginScreen onLogin={(u) => setUser(u)} />;
  }

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'finance':
        return <FinanceView />;
      case 'orders':
        return <OrdersView />;
      case 'wholesale':
        return <OrdersView channel="wholesale" title="عمده‌فروشی (B2B)" />;
      case 'retail':
        return <OrdersView channel="retail" title="خرده‌فروشی" />;
      case 'crm':
        return <CRMView />;
      case 'projects':
        return <ProjectsView />;
      case 'inbox':
      case 'whatsapp':
        return <MessengerView />;
      case 'warranty':
        return <WarrantyView />;
      case 'settings':
        return <SystemControlView />;
      case 'tankhahyar':
        return <ComingSoon title="تنخواه‌یار" note="برای این ماژول هیچ endpoint‌ای در بک‌اند تعریف نشده است." />;
      case 'leads':
        return <ComingSoon title="لیدها و پیگیری‌ها" />;
      case 'ai-agent':
        return <ComingSoon title="دستیار هوشمند (AI)" />;
      default:
        return <DashboardView />;
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

export default App;
