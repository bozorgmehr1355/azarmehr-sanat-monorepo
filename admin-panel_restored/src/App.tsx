import React, { useState } from 'react';
import { Layout } from './shared/Layout';
import { DashboardView } from './modules/dashboard/DashboardView';
import { OrdersView } from './modules/orders/OrdersView';
import { SystemControlView } from './modules/system/SystemControlView';
import { CRMView } from './modules/crm/CRMView';
import { MessengerView } from './modules/messenger/MessengerView';
import { TankhahView } from './modules/tankhah/TankhahView';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'orders':
        return <OrdersView />;
      case 'system':
        return <SystemControlView />;
      case 'crm':
        return <CRMView />;
      case 'whatsapp':
        return <MessengerView />;
      case 'tankhah':
        return <TankhahView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

export default App;