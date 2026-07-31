import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import { Card, Loading, ErrorBox, PageHeader, RefreshButton, DynamicTable, faNum } from '../../shared/ui';

export const FinanceView: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/crm-payments');
      setPayments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت پرداخت‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="در حال دریافت پرداخت‌ها..." />;
  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="مالی و حسابداری"
        subtitle="پرداخت‌های ثبت‌شده از سفارشات (crm_payments)"
        actions={<RefreshButton onClick={load} />}
      />
      <div style={{ marginBottom: 12, color: '#8b949e', fontSize: 12 }}>
        {faNum(payments.length)} رکورد پرداخت
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <DynamicTable rows={payments} />
      </Card>
    </div>
  );
};
