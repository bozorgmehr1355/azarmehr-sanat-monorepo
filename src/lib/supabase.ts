import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// الگوی متغیرهای محیطی مطابق backend/handlers/_lib.js
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // در محیط اجرا مقادیر باید وجود داشته باشند؛ بدون آن‌ها کلاینت کارایی ندارد
  console.warn(
    '[supabase] SUPABASE_URL یا کلید Supabase تنظیم نشده است — فراخوانی‌ها ناموفق خواهند بود.'
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_KEY
);
