import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import { Card, Loading, ErrorBox, PageHeader, RefreshButton, DynamicTable, faNum, StatusBadge } from '../../shared/ui';

// وضعیت‌های قابل انتخاب برای ادعای گارانتی
const CLAIM_STATUSES = ['pending', 'reviewing', 'approved', 'rejected', 'resolved', 'resolved_by_guidance'];

export const WarrantyView: React.FC = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/crm-guarantee-claims?limit=500');
      setClaims(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت ادعاهای گارانتی');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (claim: any, newStatus: string) => {
    if (!claim?.id) return;
    setUpdating(String(claim.id));
    setMsg('');
    try {
      await apiFetch(`/api/crm-guarantee-claims?id=eq.${claim.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setMsg(`✓ وضعیت ادعای #${claim.id} به «${newStatus}» تغییر کرد`);
      load();
    } catch (e: any) {
      setMsg(`✗ ${e?.message || 'خطا در تغییر وضعیت'}`);
    } finally {
      setUpdating(null);
    }
  };

  const visible = statusFilter ? claims.filter((c) => (c.status || '') === statusFilter) : claims;

  if (loading) return <Loading label="در حال دریافت ادعاهای گارانتی..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="گارانتی و خدمات"
        subtitle="ادعاهای بازگشت وجه و گارانتی ثبت‌شده از واتساپ/پورتال"
        actions={<RefreshButton onClick={load} />}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '9px 12px',
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: 8,
            color: '#f0f6fc',
            fontSize: 13,
          }}
        >
          <option value="">همه وضعیت‌ها</option>
          {CLAIM_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ color: '#8b949e', fontSize: 12 }}>{faNum(visible.length)} ادعا</span>
        {msg && <span style={{ fontSize: 13, color: msg.startsWith('✓') ? '#3fb950' : '#f85149' }}>{msg}</span>}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <DynamicTable rows={visible} />
      </Card>

      <Card>
        <h4 style={{ margin: '0 0 12px', color: '#f0f6fc', fontSize: 14 }}>تغییر وضعیت ادعا</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedClaimId}
            onChange={(e) => setSelectedClaimId(e.target.value)}
            style={{
              padding: '9px 12px',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: 8,
              color: '#f0f6fc',
              fontSize: 13,
              minWidth: 180,
            }}
          >
            <option value="">انتخاب ادعا...</option>
            {claims.map((c) => (
              <option key={c.id} value={c.id}>#{c.id} — {c.customer_name || c.name || 'بدون نام'}</option>
            ))}
          </select>
          {CLAIM_STATUSES.map((s) => (
            <button
              key={s}
              disabled={updating !== null || !selectedClaimId}
              onClick={() => {
                const claim = claims.find((c) => String(c.id) === selectedClaimId);
                if (claim) changeStatus(claim, s);
              }}
              style={{
                background: '#21262d',
                color: '#c9d1d9',
                border: '1px solid #30363d',
                borderRadius: 6,
                padding: '7px 12px',
                cursor: updating !== null || !selectedClaimId ? 'not-allowed' : 'pointer',
                fontSize: 12,
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#8b949e', marginTop: 10 }}>
          <StatusBadge status="pending" /> وضعیت‌ها: pending (در انتظار) → reviewing (در حال بررسی) → approved / rejected / resolved
        </p>
      </Card>
    </div>
  );
};
