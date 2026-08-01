// ─────────────────────────────────────────────────────────────────────────────
// تایپ مشتری (crm_customers) — هماهنگ با ستون‌های واقعی جدول در Supabase
// ─────────────────────────────────────────────────────────────────────────────

/** وضعیت مشتری — مقادیر مجاز در دیتابیس (CHECK constraint) */
export type CustomerStatus = 'new' | 'active' | 'suspended';

/** دسته مشتری — خرده‌فروشی / عمده‌فروشی */
export type CustomerCategory = 'retail' | 'wholesale';

export interface Customer {
  id: number;
  name: string;
  customer_code: string | null;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  address: string | null;
  /** نام حقوقی / شرکت */
  company_name: string | null;
  /** وضعیت مشتری */
  customer_status: CustomerStatus | string | null;
  /** دسته مشتری */
  customer_type: CustomerCategory | string | null;
  city: string | null;
  created_at: string;
  updated_at?: string | null;
  [key: string]: unknown;
}

/** ورودی فرم مشتری — فقط فیلدهای قابل ویرایش (customer_code توسط دیتابیس تولید می‌شود) */
export interface CustomerFormValues {
  name: string;
  phone: string;
  email: string;
  national_id: string;
  address: string;
  company_name: string;
  customer_status: CustomerStatus;
  customer_type: CustomerCategory;
}

/** مقادیر خالی اولیه فرم */
export const emptyCustomerForm = (): CustomerFormValues => ({
  name: '',
  phone: '',
  email: '',
  national_id: '',
  address: '',
  company_name: '',
  customer_status: 'new',
  customer_type: 'wholesale',
});
