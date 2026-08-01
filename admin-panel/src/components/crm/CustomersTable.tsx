import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';
import { faNum, faDate } from '../../shared/ui';
import type { Customer } from '../../types/customer';
import {
  Search01Icon,
  Edit01Icon,
  Delete01Icon,
  ShoppingCart01Icon,
  RefreshIcon,
  FilterIcon,
} from 'hugeicons-react';

// ─────────────────────────────────────────────────────────────────────────────
// جدول مشتریان — بارگذاری از بک‌اند (GET /api/crm-customers)، جستجو و فیلتر
// ─────────────────────────────────────────────────────────────────────────────

interface CustomersTableProps {
  /** تریگر تازه‌سازی (با تغییر مقدار، داده‌ها دوباره بارگذاری می‌شوند) */
  refreshTrigger: number;
  /** فراخوانی ویرایش */
  onEdit: (customer: Customer) => void;
  /** فراخوانی تعریف سفارش جدید برای مشتری */
  onNewOrder: (customer: Customer) => void;
  /** بعد از حذف (برای نمایش پیام) */
  onDeleted?: (customer: Customer) => void;
}

/** برچسب و رنگ وضعیت مشتری — مطابق مقادیر مجاز دیتابیس */
const STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: 'جدید', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  active: { label: 'فعال', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  suspended: { label: 'غیرفعال', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const TYPE_LABELS: Record<string, string> = {
  retail: 'خرده‌فروشی',
  wholesale: 'عمده‌فروشی',
};

export const CustomersTable: React.FC<CustomersTableProps> = ({
  refreshTrigger,
  onEdit,
  onNewOrder,
  onDeleted,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ limit: '500' });
      if (search.trim()) q.set('search', search.trim());
      const data = await apiFetch(`/api/crm-customers?${q.toString()}`);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت مشتریان');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // فیلتر سمت کلاینت (دسته و وضعیت) — جستجو سمت سرور انجام می‌شود
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (typeFilter && c.customer_type !== typeFilter) return false;
      if (statusFilter && c.customer_status !== statusFilter) return false;
      return true;
    });
  }, [customers, typeFilter, statusFilter]);

  const remove = async (customer: Customer) => {
    const ok = window.confirm(
      `آیا از حذف مشتری «${customer.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`,
    );
    if (!ok) return;
    setDeletingId(customer.id);
    try {
      await apiFetch(`/api/crm-customers?id=${customer.id}`, { method: 'DELETE' });
      onDeleted?.(customer);
      await load();
    } catch (e: any) {
      alert(e?.message || 'خطا در حذف مشتری');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* نوار جستجو و فیلتر */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search01Icon className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="جستجو بر اساس نام، تلفن یا کد مشتری..."
            className="w-full h-10 pr-9 pl-3 rounded-lg bg-slate-800/70 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <FilterIcon className="w-4 h-4 text-slate-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-2 rounded-lg bg-slate-800/70 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">همه دسته‌ها</option>
            <option value="retail">خرده‌فروشی</option>
            <option value="wholesale">عمده‌فروشی</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-2 rounded-lg bg-slate-800/70 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="new">جدید</option>
            <option value="active">فعال</option>
            <option value="suspended">غیرفعال</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            title="تازه‌سازی"
            className="h-10 w-10 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* خطا */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">در حال بارگذاری مشتریان...</div>
      ) : (
        /* Empty state */
        filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">مشتری‌ای یافت نشد.</p>
            <p className="text-xs text-slate-600 mt-1">
              {customers.length === 0
                ? 'هنوز مشتری‌ای ثبت نشده است. با دکمه «مشتری جدید» شروع کنید.'
                : 'فیلترهای فعلی نتیجه‌ای ندارد.'}
            </p>
          </div>
        ) : (
          /* جدول */
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-900 text-right">
                  <th className="px-4 py-3 text-xs font-bold text-slate-400">نام</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400">کد مشتری</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400">تلفن</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400">دسته</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400">وضعیت</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400">تاریخ ثبت</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => {
                  const sm = STATUS_META[c.customer_status as string] || {
                    label: c.customer_status || '—',
                    cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
                  };
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-slate-800/80 ${idx % 2 ? 'bg-slate-900/40' : 'bg-transparent'} hover:bg-slate-800/40 transition-colors`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-200">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-blue-300" dir="ltr">
                          {c.customer_code || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300" dir="ltr">
                        {c.phone ? faNum(c.phone) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-300">
                          {TYPE_LABELS[c.customer_type as string] || c.customer_type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${sm.cls}`}>
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{faDate(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onEdit(c)}
                            title="ویرایش"
                            className="w-8 h-8 rounded-md bg-slate-800 text-slate-300 hover:text-blue-400 hover:bg-slate-700 flex items-center justify-center transition-colors"
                          >
                            <Edit01Icon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onNewOrder(c)}
                            title="تعریف سفارش جدید"
                            className="w-8 h-8 rounded-md bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 flex items-center justify-center transition-colors"
                          >
                            <ShoppingCart01Icon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => remove(c)}
                            disabled={deletingId === c.id}
                            title="حذف"
                            className="w-8 h-8 rounded-md bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors disabled:opacity-50"
                          >
                            <Delete01Icon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <p className="text-[11px] text-slate-600">
        {faNum(filtered.length)} مشتری نمایش داده شده
        {customers.length !== filtered.length ? ` (از ${faNum(customers.length)})` : ''}
      </p>
    </div>
  );
};

export default CustomersTable;
