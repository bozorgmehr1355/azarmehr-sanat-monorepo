import React, { useState } from 'react';

export interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  icon?: React.ReactNode;
  trend?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subtext,
  color = '#1f6feb',
  icon,
  trend,
  onClick,
}) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: hover ? '#21262d' : '#161b22',
        borderColor: hover ? color : '#30363d',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '8px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      className="flex flex-col justify-between shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#8b949e] font-medium">{label}</span>
        {icon && (
          <span
            className="p-1.5 rounded"
            style={{
              backgroundColor: `${color}22`,
              color: color,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div className="text-2xl font-bold text-white tracking-tight my-1">
        {value}
      </div>

      {(subtext || trend) && (
        <div className="flex items-center gap-2 text-xs mt-2">
          {trend && (
            <span className="text-[#3fb950] font-semibold">{trend}</span>
          )}
          {subtext && <span className="text-[#8b949e]">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

export interface KPIGridProps {
  children: React.ReactNode;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {children}
    </div>
  );
};