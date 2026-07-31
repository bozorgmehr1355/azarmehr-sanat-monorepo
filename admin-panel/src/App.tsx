import React, { useState } from "react";
import { Layout } from "./shared/Layout";
import { DashboardView } from "./modules/dashboard/DashboardView";
import { OrdersView } from "./modules/orders/OrdersView";
import { SystemControlView } from "./modules/system/SystemControlView";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState("dashboard");

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView />;
      case "orders":
        return <OrdersView />;
      case "system":
        return <SystemControlView />;
      case "crm":
        return (
          <div style={{ padding: "20px", color: "#f0f6fc" }}>
            <h2>\u0645\u062F\u06CC\u0631\u06CC\u062A \u0645\u0634\u062A\u0631\u06CC\u0627\u0646 (CRM)</h2>
            <p style={{ color: "#8b949e" }}>\u0627\u06CC\u0646 \u0645\u0627\u0698\u0648\u0644 \u062F\u0631 \u062D\u0627\u0644 \u062A\u0648\u0633\u0639\u0647 \u0627\u0633\u062A...</p>
          </div>
        );
      case "whatsapp":
        return (
          <div style={{ padding: "20px", color: "#f0f6fc" }}>
            <h2>\u0648\u0627\u062A\u0633\u0622\u067E \u0648 \u067E\u06CC\u0627\u0645\u200C\u0631\u0633\u0627\u0646\u200C\u0647\u0627</h2>
            <p style={{ color: "#8b949e" }}>\u0627\u06CC\u0646 \u0645\u0627\u0698\u0648\u0644 \u062F\u0631 \u062D\u0627\u0644 \u062A\u0648\u0633\u0639\u0647 \u0627\u0633\u062A...</p>
          </div>
        );
      case "tankhah":
        return (
          <div style={{ padding: "20px", color: "#f0f6fc" }}>
            <h2>\u062A\u0646\u062E\u0648\u0627\u0647\u200C\u06CC\u0627\u0631</h2>
            <p style={{ color: "#8b949e" }}>\u0627\u06CC\u0646 \u0645\u0627\u0698\u0648\u0644 \u062F\u0631 \u062D\u0627\u0644 \u062A\u0648\u0633\u0639\u0647 \u0627\u0633\u062A...</p>
          </div>
        );
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