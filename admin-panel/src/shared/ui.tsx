import React from 'react';

// ─── کامپوننت‌های UI مشترک ───

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 12,
      padding: 20,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Loading: React.FC<{ label?: string }> = ({ label = 'در حال بارگذاری...' }) => (
  <div style={{ padding: 32, textAlign: 'center', color: '#8b949e', fontSize: 14 }}>
    <span style={{ marginLeft: 8 }}>⏳</span>
    {label}
  </div>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div
    style={{
      padding: '14px 18px',
      background: 'rgba(248,81,73,0.1)',
      border: '1px solid rgba(248,81,73,0.4)',
      borderRadius: 10,
      color: '#f85149',
      fontSize: 13,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <span>⚠️ {message}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          background: 'rgba(248,81,73,0.2)',
          color: '#f85149',
          border: '1px solid rgba(248,81,73,0.5)',
          borderRadius: 6,
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: 12,
          whiteSpace: 'nowrap',
        }}
      >
        تلاش مجدد
      </button>
    )}
  </div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f6fc', margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, color: '#8b949e', margin: '4px 0 0' }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
  </div>
);

export const RefreshButton: React.FC<{ onClick: () => void; loading?: boolean }> = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    style={{
      background: '#21262d',
      color: '#c9d1d9',
      border: '1px solid #30363d',
      borderRadius: 8,
      padding: '8px 16px',
      cursor: loading ? 'not-allowed' : 'pointer',
      fontSize: 13,
      fontWeight: 600,
    }}
  >
    {loading ? 'در حال بارگذاری...' : '↻ تازه‌سازی'}
  </button>
);

// ─── ابزارها ───

// اعداد به ارقام فارسی
export const faNum = (value: any): string => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
};

// قیمت با جداکننده هزارگان
export const faMoney = (value: any): string => {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return faNum(n.toLocaleString('en-US'));
};

// تاریخ ISO → خوانا (هجری شمسی)
export const faDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString('fa-IR');
    const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`.trim();
  } catch {
    return '—';
  }
};

// ─── برچسب‌های فارسی وضعیت ───

export const ORDER_STATUS_LABELS: Record<string, string> = {
  registered: 'ثبت‌شده',
  pending_review: 'در انتظار بررسی',
  confirmed: 'تأییدشده',
  proforma_issued: 'پیش‌فاکتور صادرشده',
  pending_payment: 'در انتظار پرداخت',
  payment_confirmed: 'پرداخت تأییدشده',
  in_production: 'در حال تولید',
  ready_to_ship: 'آماده ارسال',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغو شده',
};

export const STATUS_COLORS: Record<string, string> = {
  registered: '#3b82f6',
  pending_review: '#f59e0b',
  confirmed: '#10b981',
  proforma_issued: '#d97706',
  pending_payment: '#f59e0b',
  payment_confirmed: '#10b981',
  in_production: '#8b5cf6',
  ready_to_ship: '#06b6d4',
  shipped: '#3b82f6',
  delivered: '#10b981',
  cancelled: '#ef4444',
  active: '#10b981',
  pending: '#f59e0b',
  new: '#3b82f6',
  suspended: '#ef4444',
};

export const statusLabel = (key?: string | null): string => {
  if (!key) return '—';
  return ORDER_STATUS_LABELS[key] || CUSTOMER_STATUS_LABELS[key] || key;
};

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  new: 'جدید',
  pending: 'در انتظار',
  suspended: 'مسدود',
  wholesale: 'عمده',
  retail: 'خرده',
};

export const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  if (!status) return <span style={{ color: '#8b949e', fontSize: 12 }}>—</span>;
  const color = STATUS_COLORS[status] || '#8b949e';
  return (
    <span
      style={{
        display: 'inline-block',
        background: `${color}1a`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: 20,
        padding: '3px 12px',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {statusLabel(status)}
    </span>
  );
};

// ستون‌های پویا برای جداولی که schema آن‌ها در مخزن نیست
export const DYNAMIC_KEY_LABELS: Record<string, string> = {
  id: 'شناسه',
  created_at: 'تاریخ',
  updated_at: 'آخرین تغییر',
  customer_id: 'مشتری',
  order_id: 'سفارش',
  amount: 'مبلغ',
  total_amount: 'مبلغ کل',
  method: 'روش پرداخت',
  payment_method: 'روش پرداخت',
  status: 'وضعیت',
  verified: 'تأییدشده',
  reason: 'دلیل',
  product_code: 'کد محصول',
  customer_phone: 'تلفن مشتری',
  customer_name: 'نام مشتری',
  customer_address: 'آدرس',
  note: 'توضیح',
  notes: 'توضیحات',
  message: 'پیام',
  sender_name: 'ارسال‌کننده',
  sender_type: 'نوع',
  is_read: 'خوانده‌شده',
  title: 'عنوان',
  description: 'توضیحات',
};

export const EXCLUDED_KEYS = new Set([
  'deleted_at', 'avatar', 'password', 'notes', 'items', 'payment_documents',
  'customer_user_agent', 'customer_ip_address', 'proforma_issued_at',
  'proforma_approved_at', 'proforma_rejected_at', 'auth_user_id', 'user_id',
  'approved_by', 'last_login_at', 'birth_date', 'legal_consent_version',
  'legal_consent_at', 'portal_password', 'sheba', 'bank_account', 'national_id',
  'company_national_id', 'economic_code', 'registration_no', 'internal_note',
]);

// ─── جدول پویا برای داده‌هایی که schema آن‌ها در مخزن نیست ───
export const DynamicTable: React.FC<{ rows: any[]; maxCols?: number }> = ({ rows, maxCols = 12 }) => {
  if (rows.length === 0) {
    return <p style={{ padding: 24, color: '#8b949e', fontSize: 13, textAlign: 'center' }}>رکوردی یافت نشد.</p>;
  }

  const keys: string[] = [];
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (keys.includes(k)) continue;
      if (EXCLUDED_KEYS.has(k)) continue;
      if (typeof row[k] === 'object' && row[k] !== null) continue;
      if (k.startsWith('_')) continue;
      keys.push(k);
    }
    if (keys.length >= maxCols) break;
  }

  const render = (row: any, key: string) => {
    const v = row[key];
    if (key === 'status' && typeof v === 'string') return <StatusBadge status={v} />;
    if (key === 'created_at' || key === 'updated_at' || key === 'paid_at' || key === 'delivered_at' || key === 'shipped_at') {
      return <span style={{ color: '#8b949e' }}>{faDate(v)}</span>;
    }
    if (['amount', 'total_amount', 'total', 'line_total', 'subtotal', 'discount', 'debt'].includes(key)) {
      return faMoney(v);
    }
    if (typeof v === 'boolean') return v ? '✓' : '✗';
    if (v === null || v === undefined || v === '') return '—';
    return typeof v === 'string' ? v : String(v);
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
            {keys.map((k) => (
              <th key={k} style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                {DYNAMIC_KEY_LABELS[k] || k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx} style={{ borderBottom: '1px solid #21262d' }}>
              {keys.map((k) => (
                <td key={k} style={{ padding: '12px 10px', color: k === 'id' ? '#f0f6fc' : '#c9d1d9', fontWeight: k === 'id' ? 600 : 400 }}>
                  {render(row, k)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
