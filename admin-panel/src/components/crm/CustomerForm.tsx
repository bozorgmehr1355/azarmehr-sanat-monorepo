import React, { useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';
import {
  emptyCustomerForm,
  type Customer,
  type CustomerFormValues,
} from '../../types/customer';
import { PlusSignIcon, Cancel01Icon, UserAdd01Icon } from 'hugeicons-react';

// ─────────────────────────────────────────────────────────────────────────────
// فرم ثبت / ویرایش مشتری — اتصال به بک‌اند (POST/PUT روی /api/crm-customers)
// customer_code توسط دیتابیس (سیکوئنس CUST-xxxxx) تولید می‌شود؛ فرم فقط یک
// پیش‌نمایش کد پیشنهادی نشان می‌دهد و کد واقعی پس از ثبت از پاسخ سرور می‌آید.
// ─────────────────────────────────────────────────────────────────────────────

interface CustomerFormProps {
  /** مشتری در حال ویرایش — null یعنی ثبت جدید */
  editing?: Customer | null;
  /** فراخوانی پس از موفقیت (ثبت یا ویرایش) */
  onSuccess: (saved: Customer) => void;
  /** فراخوانی بستن فرم */
  onCancel: () => void;
}

const PHONE_RE = /^[0-9+]{10,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** تولید کد پیشنهادی CUST-xxxxx برای نمایش (کد نهایی را دیتابیس می‌سازد) */
const suggestCode = (): string => {
  const n = 10000 + Math.floor(Math.random() * 89999);
  return `CUST-${String(n).padStart(5, '0')}`;
};

const inputCls =
  'w-full h-10 px-3 rounded-lg bg-slate-800/70 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors';

const labelCls = 'block text-xs font-semibold text-slate-400 mb-1.5';

export const CustomerForm: React.FC<CustomerFormProps> = ({ editing, onSuccess, onCancel }) => {
  const [form, setForm] = useState<CustomerFormValues>(() =>
    editing
      ? {
          name: editing.name || '',
          phone: editing.phone || '',
          email: editing.email || '',
          national_id: editing.national_id || '',
          address: editing.address || '',
          company_name: editing.company_name || '',
          customer_status: (editing.customer_status as CustomerFormValues['customer_status']) || 'lead',
          customer_type: (editing.customer_type as CustomerFormValues['customer_type']) || 'wholesale',
        }
      : emptyCustomerForm(),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // کد پیشنهادی فقط برای نمایش در حالت ثبت جدید
  const previewCode = useMemo(() => (editing ? editing.customer_code || '—' : suggestCode()), [editing]);

  const set = (key: keyof CustomerFormValues, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'نام مشتری الزامی است';
    if (form.phone && !PHONE_RE.test(form.phone)) errs.phone = 'شماره تلفن معتبر نیست (۱۰ تا ۱۵ رقم)';
    if (form.email && !EMAIL_RE.test(form.email)) errs.email = 'ایمیل معتبر نیست';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError('');
    try {
      if (editing) {
        const saved = await apiFetch(`/api/crm-customers`, {
          method: 'PUT',
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        onSuccess(saved as Customer);
      } else {
        const saved = await apiFetch('/api/crm-customers', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        onSuccess(saved as Customer);
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در ذخیره مشتری');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4"
      noValidate
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <UserAdd01Icon className="w-5 h-5 text-blue-400" />
          {editing ? `ویرایش مشتری — ${editing.customer_code || `#${editing.id}`}` : 'مشتری جدید'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-md bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
          aria-label="بستن فرم"
        >
          <Cancel01Icon className="w-4 h-4" />
        </button>
      </div>

      {/* کد مشتری — فقط نمایشی */}
      <div className="rounded-lg bg-slate-800/50 border border-dashed border-slate-600 px-3 py-2.5 flex items-center justify-between">
        <span className="text-xs text-slate-400">کد مشتری</span>
        <span className="text-sm font-mono font-bold text-blue-300" dir="ltr">
          {previewCode}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 -mt-2">
        کد نهایی به‌صورت خودکار توسط سیستم (سیکوئنس CUST-xxxxx) تولید می‌شود.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            نام مشتری <span className="text-red-400">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="مثلاً: فروشگاه رضا"
            className={inputCls}
          />
          {fieldErrors.name && <p className="text-[11px] text-red-400 mt-1">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className={labelCls}>نام حقوقی / شرکت</label>
          <input
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
            placeholder="مثلاً: شرکت بازرگانی البرز"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>کد ملی / شناسه</label>
          <input
            value={form.national_id}
            onChange={(e) => set('national_id', e.target.value)}
            placeholder="کد ملی یا شناسه ملی"
            className={inputCls}
            dir="ltr"
          />
        </div>

        <div>
          <label className={labelCls}>تلفن</label>
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="0912xxxxxxx"
            className={inputCls}
            dir="ltr"
          />
          {fieldErrors.phone && <p className="text-[11px] text-red-400 mt-1">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label className={labelCls}>ایمیل</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="example@email.com"
            className={inputCls}
            dir="ltr"
          />
          {fieldErrors.email && <p className="text-[11px] text-red-400 mt-1">{fieldErrors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>وضعیت</label>
            <select
              value={form.customer_status}
              onChange={(e) => set('customer_status', e.target.value)}
              className={inputCls}
            >
            <option value="new">جدید</option>
            <option value="active">فعال</option>
            <option value="suspended">غیرفعال</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>دسته</label>
            <select
              value={form.customer_type}
              onChange={(e) => set('customer_type', e.target.value)}
              className={inputCls}
            >
              <option value="wholesale">عمده‌فروشی</option>
              <option value="retail">خرده‌فروشی</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>آدرس</label>
          <textarea
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="آدرس کامل مشتری"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <PlusSignIcon className="w-4 h-4" />
          {saving ? 'در حال ذخیره...' : editing ? 'ذخیره تغییرات' : 'ثبت مشتری'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-60 transition-colors"
        >
          انصراف
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
