import React from 'react';

export const DashboardCharts: React.FC = () => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* نمودار وضعیت سفارشات */}
      <div
        style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f0f6fc', marginBottom: '16px' }}>
          وضعیت سفارشات
        </h3>
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>
          {/* جایگاه نمودار دونات */}
          <span>نمودار تفکیک وضعیت سفارشات</span>
        </div>
      </div>

      {/* نمودار فروش ۶ ماه اخیر */}
      <div
        style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f0f6fc', marginBottom: '16px' }}>
          فروش ۶ ماه اخیر
        </h3>
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>
          {/* جایگاه نمودار میله‌ای/خطی */}
          <span>نمودار روند فروش</span>
        </div>
      </div>
    </div>
  );
};
