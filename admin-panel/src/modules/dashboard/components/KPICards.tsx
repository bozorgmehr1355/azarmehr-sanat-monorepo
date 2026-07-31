import React from 'react';

export interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  sub,
  color = '#d97706',
  icon = '📊',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '12px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: '#8b949e', fontWeight: 500 }}>{label}</span>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: ${color}22,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}
        >
          {icon}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#f0f6fc', marginBottom: '4px' }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: '11px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{sub}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export interface KPIGridProps {
  cards: KPICardProps[];
}

export const KPIGrid: React.FC<KPIGridProps> = ({ cards }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}
      className="kpi-grid-container"
    >
      {cards.map((card, index) => (
        <KPICard key={index} {...card} />
      ))}
    </div>
  );
};
