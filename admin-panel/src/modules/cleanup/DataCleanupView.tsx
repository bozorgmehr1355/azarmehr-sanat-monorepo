import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import { Card, Loading, ErrorBox, PageHeader, RefreshButton, faNum, faDate } from '../../shared/ui';
import {
  DatabaseIcon,
  InboxIcon,
  Link01Icon,
  Unlink01Icon,
  Search01Icon,
  Alert02Icon,
  RefreshIcon,
} from 'hugeicons-react';

// ═══════════════════════════════════════════════════════════════════════════
// DataCleanupView — پاکسازی داده → Unified Messages (Admin Tools)
// ═══════════════════════════════════════════════════════════════════════════
// MVP: فقط بررسی و شناسایی داده‌های تست/مهاجرت‌شده. هیچ حذف/تغییری انجام
// نمی‌شود — این ابزار در MVP صرفاً read-only است.
// ═══════════════════════════════════════════════════════════════════════════

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'واتساپ',
  instagram: 'اینستاگرام',
  telegram: 'تلگرام',
  email: 'ایمیل',
  phone: 'تلفن',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  sent: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  read: 'خوانده‌شده',
  failed: 'ناموفق',
  auto_replied: 'پاسخ خودکار',
  received: 'دریافت‌شده',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  sent: '#3b82f6',
  delivered: '#06b6d4',
  read: '#10b981',
  failed: '#ef4444',
  auto_replied: '#8b5cf6',
  received: '#3b82f6',
};

const channelLabel = (ch?: string | null): string => CHANNEL_LABELS[ch || ''] || ch || '—';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  icon: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, subtext, color, icon }) => (
  <div
    style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 12,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      flex: 1,
      minWidth: 160,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#8b949e' }}>{label}</span>
      <span className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color, backgroundColor: `${color}22` }}>
        {icon}
      </span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color }}>{faNum(value)}</div>
    {subtext && <div style={{ fontSize: 11, color: '#8b949e' }}>{subtext}</div>}
  </div>
);

export const DataCleanupView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);

  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // ─── آمار کلی ─────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const data = await apiFetch('/api/unified-messages/stats');
      if (data?.ok) setStats(data);
      else setStats(null);
    } catch {
      setStats(null);
    }
  }, []);

  // ─── لیست پیام‌ها ─────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams();
      if (channel) params.set('channel', channel);
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      if (unmappedOnly) params.set('unmapped', 'true');
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));

      const data = await apiFetch(`/api/unified-messages?${params.toString()}`);
      if (data?.ok) {
        setRows(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
      } else {
        setRows([]);
        setTotal(0);
        setListError(data?.error || 'پاسخ نامعتبر');
      }
    } catch (e: any) {
      setListError(e?.message || 'خطا در دریافت پیام‌ها');
      setRows([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [channel, status, search, unmappedOnly, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setLoading(false);
    setError('');
  }, [stats]);

  const applySearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setChannel('');
    setStatus('');
    setSearch('');
    setSearchInput('');
    setUnmappedOnly(false);
    setPage(0);
  };

  const refreshAll = () => {
    setPage(0);
    loadStats();
    loadList();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <PageHeader
        title="پاکسازی داده — پیام‌های یکپارچه"
        subtitle="بررسی امن داده‌های تست/مهاجرت‌شده در unified_messages (فقط read-only در MVP)"
        actions={<RefreshButton onClick={refreshAll} loading={loading || listLoading} />}
      />

      {/* هشدار امنیتی */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          padding: '12px 16px',
          background: 'rgba(217,119,6,0.08)',
          border: '1px solid rgba(217,119,6,0.35)',
          borderRadius: 10,
          fontSize: 12,
          color: '#fbbf24',
          lineHeight: 1.8,
        }}
      >
        <Alert02Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          این ابزار در نسخه MVP فقط نمایش و شناسایی است؛ هیچ عملیات حذف یا تغییر داده‌ای انجام نمی‌شود.
          پیام‌های بدون مشتری مرتبط (unmapped) نامزدهای بررسی برای پاکسازی تستی هستند.
        </span>
      </div>

      {/* ─── آمار ─── */}
      {loading && <Loading label="در حال دریافت آمار..." />}
      {error && <ErrorBox message={error} onRetry={loadStats} />}

      {!loading && !error && stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <StatsCard label="کل پیام‌ها" value={stats.total} color="#3b82f6" icon={<InboxIcon className="w-4 h-4" />} />
          <StatsCard
            label="بدون مشتری مرتبط"
            value={stats.unmapped}
            subtext="نامزدهای پاکسازی تستی"
            color="#f59e0b"
            icon={<Unlink01Icon className="w-4 h-4" />}
          />
          <StatsCard
            label="دارای مشتری مرتبط"
            value={stats.mapped}
            subtext="پیام‌های متصل به CRM"
            color="#10b981"
            icon={<Link01Icon className="w-4 h-4" />}
          />
          {Object.entries(stats.by_channel || {})
            .filter(([ch]) => ch !== 'other' && Number((stats.by_channel as any)[ch]) > 0)
            .map(([ch, val]) => (
              <StatsCard key={ch} label={channelLabel(ch)} value={val as number} color="#8b5cf6" icon={<DatabaseIcon className="w-4 h-4" />} />
            ))}
        </div>
      )}

      {/* ─── فیلترها ─── */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150 }}>
            <label style={{ fontSize: 11, color: '#8b949e' }}>کانال</label>
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(0);
              }}
              style={selectStyle}
            >
              <option value="">همه کانال‌ها</option>
              {Object.entries(CHANNEL_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150 }}>
            <label style={{ fontSize: 11, color: '#8b949e' }}>وضعیت</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              style={selectStyle}
            >
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220, flex: 1 }}>
            <label style={{ fontSize: 11, color: '#8b949e' }}>جستجو (شماره / نام / متن)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                placeholder="مثلاً 0912..."
                style={inputStyle}
              />
              <button onClick={applySearch} style={primaryBtn}>
                <Search01Icon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c9d1d9', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={unmappedOnly}
              onChange={(e) => {
                setUnmappedOnly(e.target.checked);
                setPage(0);
              }}
              style={{ accentColor: '#f59e0b' }}
            />
            فقط بدون مشتری (نامزد پاکسازی)
          </label>

          <button onClick={resetFilters} style={secondaryBtn}>
            <RefreshIcon className="w-4 h-4" />
            بازنشانی
          </button>
        </div>
      </Card>

      {/* ─── جدول پیام‌ها ─── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc' }}>پیام‌ها</span>
          <span style={{ fontSize: 12, color: '#8b949e' }}>{faNum(total)} پیام</span>
        </div>

        {listLoading && <Loading label="در حال دریافت پیام‌ها..." />}
        {!listLoading && listError && <ErrorBox message={listError} onRetry={loadList} />}

        {!listLoading && !listError && (
          <>
            {rows.length === 0 ? (
              <p style={{ padding: 32, textAlign: 'center', color: '#8b949e', fontSize: 13 }}>
                پیامی مطابق فیلترها یافت نشد.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
                      {['تاریخ', 'کانال', 'فرستنده', 'شماره / شناسه', 'وضعیت', 'مشتری مرتبط', 'متن پیام'].map((h) => (
                        <th key={h} style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #21262d', verticalAlign: 'top' }}>
                        <td style={{ padding: '10px 12px', color: '#8b949e', whiteSpace: 'nowrap' }}>{faDate(m.created_at)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: '#8b5cf622', color: '#c4b5fd' }}>
                            {channelLabel(m.channel)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#f0f6fc', whiteSpace: 'nowrap' }}>{m.sender_name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#c9d1d9', whiteSpace: 'nowrap', direction: 'ltr' }}>
                          {m.sender_phone || m.channel_user_id || '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: `${STATUS_COLORS[m.status] || '#8b949e'}1a`,
                              color: STATUS_COLORS[m.status] || '#8b949e',
                              border: `1px solid ${STATUS_COLORS[m.status] || '#8b949e'}55`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {STATUS_LABELS[m.status] || m.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {m.crm_customer_id ? (
                            <span style={{ color: '#10b981' }}>✓ {faNum(m.crm_customer_id)}</span>
                          ) : (
                            <span style={{ color: '#f59e0b' }}>— بدون مشتری</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#8b949e', maxWidth: 320 }}>
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {m.message || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* صفحه‌بندی */}
            {totalPages > 1 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #21262d', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={pagerBtn(page === 0)}
                >
                  قبلی
                </button>
                <span style={{ fontSize: 12, color: '#8b949e' }}>
                  صفحه {faNum(page + 1)} از {faNum(totalPages)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={pagerBtn(page >= totalPages - 1)}
                >
                  بعدی
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

// ─── استایل‌های مشترک (هم‌راستا با طراحی فعلی) ───
const selectStyle: React.CSSProperties = {
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#f0f6fc',
  fontSize: 13,
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#f0f6fc',
  fontSize: 13,
  outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  background: '#1f6feb',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: '#21262d',
  color: '#c9d1d9',
  border: '1px solid #30363d',
  borderRadius: 8,
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

const pagerBtn = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? '#161b22' : '#21262d',
  color: disabled ? '#484f58' : '#c9d1d9',
  border: '1px solid #30363d',
  borderRadius: 6,
  padding: '6px 14px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 12,
});

export default DataCleanupView;
