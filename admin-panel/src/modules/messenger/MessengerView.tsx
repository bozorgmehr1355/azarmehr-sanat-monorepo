import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch, getStoredUser } from '../../config/api';
import { Card, Loading, ErrorBox, PageHeader, RefreshButton, faNum, faDate, StatusBadge } from '../../shared/ui';

export const MessengerView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const me = getStoredUser();

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const data = await apiFetch('/api/crm-orders?limit=100');
      setOrders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setOrdersError(e?.message || 'خطا در دریافت سفارشات');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openOrder = useCallback(async (order: any) => {
    setSelectedOrder(order);
    setChatLoading(true);
    setChatError('');
    try {
      const data = await apiFetch(`/api/chat?order_id=${order.id}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setChatError(e?.message || 'خطا در دریافت پیام‌ها');
    } finally {
      setChatLoading(false);
    }
  }, []);

  const send = async () => {
    if (!selectedOrder || !input.trim() || sending) return;
    setSending(true);
    try {
      await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          order_id: selectedOrder.id,
          sender_id: String(me?.id ?? ''),
          sender_type: 'admin',
          sender_name: me?.name || 'مدیر',
          message: input.trim(),
        }),
      });
      setInput('');
      openOrder(selectedOrder);
    } catch (e: any) {
      setChatError(e?.message || 'خطا در ارسال پیام');
    } finally {
      setSending(false);
    }
  };

  if (ordersLoading) return <Loading label="در حال دریافت سفارشات..." />;
  if (ordersError) return <ErrorBox message={ordersError} onRetry={loadOrders} />;

  return (
    <div>
      <PageHeader
        title="پیام‌رسان / گفتگوی سفارشات"
        subtitle="گفتگوی مشتری-مدیریت برای هر سفارش (order_chat)"
        actions={<RefreshButton onClick={loadOrders} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* لیست سفارشات */}
        <Card style={{ padding: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          {orders.length === 0 ? (
            <p style={{ padding: 24, color: '#8b949e', fontSize: 13 }}>سفارشی برای گفتگو نیست.</p>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                onClick={() => openOrder(o)}
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #21262d',
                  cursor: 'pointer',
                  background: selectedOrder?.id === o.id ? '#1c2129' : 'transparent',
                  borderRight: selectedOrder?.id === o.id ? '3px solid #d97706' : '3px solid transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc' }}>
                  {o.tracking_code || o.order_no || `#${o.id}`}
                </div>
                <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>
                  {o.crm_customers?.name || o.customer_name || 'مشتری'}
                </div>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={o.order_status || o.status} />
                </div>
              </div>
            ))
          )}
        </Card>

        {/* گفتگو */}
        {selectedOrder ? (
          <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 220px)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #30363d', background: '#1c2129' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f6fc' }}>
                گفتگوی سفارش {selectedOrder.tracking_code || selectedOrder.order_no || `#${selectedOrder.id}`}
              </div>
              <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>
                {selectedOrder.crm_customers?.name || selectedOrder.customer_name || ''} — {faNum(selectedOrder.customer_phone || selectedOrder.crm_customers?.phone || '')}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', minHeight: 240 }}>
              {chatLoading ? (
                <Loading label="در حال دریافت پیام‌ها..." />
              ) : chatError ? (
                <ErrorBox message={chatError} onRetry={() => openOrder(selectedOrder)} />
              ) : messages.length === 0 ? (
                <p style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  هنوز پیامی در این گفتگو ثبت نشده است.
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_type === 'admin';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        justifyContent: mine ? 'flex-start' : 'flex-end',
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          background: mine ? '#1f6feb' : '#21262d',
                          color: '#f0f6fc',
                          borderRadius: 12,
                          padding: '10px 14px',
                          fontSize: 13,
                          lineHeight: 1.7,
                        }}
                      >
                        <div style={{ fontSize: 11, color: mine ? '#c7d9ff' : '#8b949e', marginBottom: 4 }}>
                          {m.sender_name || (mine ? 'مدیر' : 'مشتری')}
                        </div>
                        {m.message}
                        <div style={{ fontSize: 10, color: mine ? '#9db8e8' : '#666', marginTop: 6, direction: 'ltr', textAlign: mine ? 'right' : 'left' }}>
                          {faDate(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #30363d', display: 'flex', gap: 10 }}>
              <input
                placeholder="پیام خود را بنویسید..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: 8,
                  color: '#f0f6fc',
                  fontSize: 13,
                }}
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                style={{
                  background: sending || !input.trim() ? '#8a6a2f' : '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0 22px',
                  cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {sending ? '...' : 'ارسال'}
              </button>
            </div>
          </Card>
        ) : (
          <Card>
            <p style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              از فهرست سمت راست یک سفارش را انتخاب کنید تا گفتگوی آن نمایش داده شود.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
