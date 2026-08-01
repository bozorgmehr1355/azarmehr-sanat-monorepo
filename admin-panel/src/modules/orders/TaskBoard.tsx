import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import { Card, Loading, faNum, faDate } from '../../shared/ui';

// ─── برچسب و رنگ وضعیت‌های مرحله کاری ─────────────────────────────────────────
export const TASK_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'در انتظار',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  done:      { label: 'تکمیل‌شده',      color: '#3fb950', bg: 'rgba(63,185,80,0.12)' },
  rejected:  { label: 'ردشده',          color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  blocked:   { label: 'متوقف',          color: '#f85149', bg: 'rgba(248,81,73,0.14)' },
  returned:  { label: 'برگشت‌خورده',    color: '#d97706', bg: 'rgba(217,119,6,0.14)' },
};

export const TASK_STATUS_ORDER = ['pending', 'done', 'rejected', 'blocked', 'returned'];

// نام فارسی مراحل کاری (stage)
export const STAGE_LABELS: Record<string, string> = {
  sales_review:     'بررسی اولیه فروش',
  proforma_pending: 'آماده‌سازی پیش‌فاکتور',
  proforma_sent:    'تأیید پیش‌فاکتور توسط مشتری',
  payment_pending:  'پیگیری پرداخت',
  preparation:      'آماده‌سازی کالا',
  exit_approval:    'فاکتور نهایی و تأیید خروج',
  ready_to_ship:    'آماده‌سازی بارگیری',
  shipping:         'حمل و ارسال',
};

// نام مسئول (assignee) — username ادمین‌ها
export const ASSIGNEE_LABELS: Record<string, string> = {
  ardestani: 'اردستانی',
  dolatkhah: 'دل‌تخواه',
  hosseini: 'حسینی',
  serajeddin: 'سراج‌الدین',
  moradi: 'مرادی',
  customer: 'مشتری',
};

// ─── محاسبه مدت زمان انجام ────────────────────────────────────────────────────
const durationText = (startedAt?: string | null, completedAt?: string | null): string | null => {
  const start = startedAt ? new Date(startedAt).getTime() : null;
  if (!start) return null;
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  if (minutes < 60) return `${faNum(minutes)} دقیقه`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${faNum(hours)} ساعت و ${faNum(rest)} دقیقه` : `${faNum(hours)} ساعت`;
};

interface Task {
  id: number;
  order_id: number;
  stage: string;
  assignee: string;
  status: string;
  details?: Record<string, any> | null;
  order_index: number;
  created_at: string;
  completed_at: string | null;
  started_at: string | null;
  stopped_reason: string | null;
}

interface TaskBoardProps {
  orderId: number;
  onChanged?: () => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ orderId, onChanged }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  // مودال دلیل توقف
  const [stopModal, setStopModal] = useState<{ task: Task; status: 'blocked' | 'returned' } | null>(null);
  const [stopReason, setStopReason] = useState('');
  const [stopSaving, setStopSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/crm-order-tasks?order_id=${orderId}`);
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت مراحل کاری');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── تغییر وضعیت ────────────────────────────────────────────────────────────
  const changeStatus = async (task: Task, newStatus: string, reason?: string) => {
    setSavingId(task.id);
    try {
      await apiFetch('/api/crm-order-tasks', {
        method: 'PUT',
        body: JSON.stringify({
          id: task.id,
          status: newStatus,
          ...(reason !== undefined ? { stop_reason: reason } : {}),
        }),
      });
      setStopModal(null);
      setStopReason('');
      await load();
      onChanged?.();
    } catch (e: any) {
      // خطای دلیل اجباری را داخل مودال نمایش می‌دهیم
      if (e?.status === 400 && stopModal) {
        alert(e?.message || 'دلیل توقف الزامی است');
      } else {
        alert(e?.message || 'خطا در تغییر وضعیت');
      }
    } finally {
      setSavingId(null);
      setStopSaving(false);
    }
  };

  // ── انتخاب وضعیت از dropdown ───────────────────────────────────────────────
  const handleSelect = (task: Task, newStatus: string) => {
    if (newStatus === task.status) return;
    if (newStatus === 'blocked' || newStatus === 'returned') {
      setStopReason('');
      setStopModal({ task, status: newStatus });
      return;
    }
    changeStatus(task, newStatus);
  };

  const submitStopReason = () => {
    if (!stopModal) return;
    const reason = stopReason.trim();
    if (!reason) {
      alert('لطفاً دلیل توقف را وارد کنید');
      return;
    }
    setStopSaving(true);
    changeStatus(stopModal.task, stopModal.status, reason);
  };

  if (loading) return <Loading label="در حال دریافت مراحل کاری..." />;
  if (error) return <div style={{ padding: 20, color: '#f85149', fontSize: 13 }}>{error}</div>;
  if (tasks.length === 0) {
    return (
      <Card style={{ marginTop: 16 }}>
        <h4 style={{ margin: '0 0 6px', color: '#f0f6fc', fontSize: 14 }}>مراحل کاری</h4>
        <p style={{ margin: 0, color: '#8b949e', fontSize: 13 }}>
          برای این سفارش هنوز مراحل کاری ایجاد نشده است (دکمه «تبدیل به پروژه»).
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#f0f6fc', fontSize: 14 }}>مراحل کاری سفارش</h4>
          <span style={{ fontSize: 11, color: '#8b949e' }}>{faNum(tasks.length)} مرحله</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#8b949e', textAlign: 'right', borderBottom: '1px solid #30363d' }}>
                <th style={{ padding: '10px 12px' }}>#</th>
                <th style={{ padding: '10px 12px' }}>مرحله</th>
                <th style={{ padding: '10px 12px' }}>مسئول</th>
                <th style={{ padding: '10px 12px' }}>وضعیت</th>
                <th style={{ padding: '10px 12px' }}>زمان انجام</th>
                <th style={{ padding: '10px 12px' }}>دلیل توقف</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const meta = TASK_STATUS_META[t.status] || { label: t.status, color: '#8b949e', bg: 'transparent' };
                const dur = durationText(t.started_at, t.completed_at);
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 12px', color: '#8b949e' }}>{faNum(t.order_index)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f0f6fc' }}>
                      {STAGE_LABELS[t.stage] || t.stage}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#c9d1d9' }}>
                      {ASSIGNEE_LABELS[t.assignee] || t.assignee || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={t.status}
                        disabled={savingId === t.id}
                        onChange={(e) => handleSelect(t, e.target.value)}
                        style={{
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.color}55`,
                          borderRadius: 20,
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {TASK_STATUS_ORDER.map((s) => (
                          <option key={s} value={s} style={{ color: '#0d1117', background: '#161b22' }}>
                            {TASK_STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#c9d1d9', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {t.started_at ? (
                        <>
                          شروع: {faDate(t.started_at)}
                          <div style={{ color: t.completed_at ? '#3fb950' : '#f59e0b', fontSize: 11 }}>
                            {t.completed_at ? 'مدت انجام: ' : 'در حال انجام — '}
                            {dur}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#8b949e' }}>شروع نشده</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {t.stopped_reason ? (
                        <span
                          title={t.stopped_reason}
                          style={{
                            display: 'inline-block',
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            color: '#f85149',
                          }}
                        >
                          {t.stopped_reason}
                        </span>
                      ) : (
                        <span style={{ color: '#8b949e', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── مودال دلیل توقف ─── */}
      {stopModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => { if (!stopSaving) setStopModal(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 12,
              padding: 22,
              maxWidth: 420,
              width: '100%',
            }}
          >
            <h4 style={{ margin: '0 0 6px', color: '#f0f6fc', fontSize: 15 }}>
              {stopModal.status === 'blocked' ? 'توقف مرحله کاری' : 'برگشت مرحله کاری'}
            </h4>
            <p style={{ margin: '0 0 16px', color: '#8b949e', fontSize: 13 }}>
              مرحله «{STAGE_LABELS[stopModal.task.stage] || stopModal.task.stage}» — وارد کردن دلیل{' '}
              <span style={{ color: '#f85149', fontWeight: 600 }}>الزامی</span> است.
            </p>
            <textarea
              autoFocus
              rows={4}
              value={stopReason}
              onChange={(e) => setStopReason(e.target.value)}
              placeholder={
                stopModal.status === 'blocked'
                  ? 'دلیل توقف (مثلاً: منتظر تأیید مشتری، مشکل پرداخت، کمبود موجودی...)'
                  : 'دلیل برگشت (مثلاً: نقص در اطلاعات، نیاز به اصلاح پیش‌فاکتور...)'
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: 8,
                color: '#f0f6fc',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: 90,
              }}
            />
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-start', gap: 8 }}>
              <button
                onClick={submitStopReason}
                disabled={stopSaving}
                style={{
                  background: '#f85149',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  cursor: stopSaving ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {stopSaving ? 'در حال ثبت...' : 'ثبت دلیل و تغییر وضعیت'}
              </button>
              <button
                onClick={() => setStopModal(null)}
                disabled={stopSaving}
                style={{
                  background: '#21262d',
                  color: '#c9d1d9',
                  border: '1px solid #30363d',
                  borderRadius: 8,
                  padding: '9px 16px',
                  cursor: stopSaving ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskBoard;
