import React, { useState } from 'react';
import { CustomerForm } from '../components/crm/CustomerForm';
import { CustomersTable } from '../components/crm/CustomersTable';
import type { Customer } from '../types/customer';
import { UserAdd01Icon } from 'hugeicons-react';

// ─────────────────────────────────────────────────────────────────────────────
// صفحه مدیریت مشتریان (CRM)
// مدیریت باز/بسته بودن فرم ثبت/ویرایش + تریگر تازه‌سازی جدول
// ─────────────────────────────────────────────────────────────────────────────

export const CustomersPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toast, setToast] = useState('');

  const openNew = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleSaved = (saved: Customer) => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    setRefreshTrigger((t) => t + 1);
    setToast(
      editingCustomer
        ? `✓ تغییرات مشتری «${saved.name}» ذخیره شد`
        : `✓ مشتری «${saved.name}» ثبت شد (کد: ${saved.customer_code || 'خودکار'})`,
    );
    window.setTimeout(() => setToast(''), 3500);
  };

  const handleDeleted = (customer: Customer) => {
    setToast(`مشتری «${customer.name}» حذف شد`);
    window.setTimeout(() => setToast(''), 3500);
  };

  const handleNewOrder = (customer: Customer) => {
    // انتقال به ماژول فروش — پره انتخاب مشتری در صفحه سفارشات
    setToast(`برای مشتری «${customer.name}» سفارش جدید تعریف کنید (ماژول فروش)`);
    window.setTimeout(() => setToast(''), 3500);
    window.dispatchEvent(
      new CustomEvent('az:new-order', { detail: { customerId: customer.id, customerName: customer.name } }),
    );
  };

  return (
    <div className="space-y-5">
      {/* هدر صفحه */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">مدیریت مشتریان</h1>
          <p className="text-xs text-slate-500 mt-1">
            ثبت، جستجو و مدیریت مشتریان خرده و عمده فروشی
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
          >
            <UserAdd01Icon className="w-4 h-4" />
            مشتری جدید
          </button>
        )}
      </div>

      {/* فرم ثبت/ویرایش */}
      {isFormOpen && (
        <CustomerForm
          editing={editingCustomer}
          onSuccess={handleSaved}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* جدول مشتریان */}
      <CustomersTable
        refreshTrigger={refreshTrigger}
        onEdit={openEdit}
        onNewOrder={handleNewOrder}
        onDeleted={handleDeleted}
      />

      {/* پیام موقت (toast) */}
      {toast && (
        <div className="fixed bottom-5 right-1/2 translate-x-1/2 z-50 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm text-emerald-300 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
