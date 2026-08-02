// پیکربندی API و احراز هویت پنل ادمین

function normalizeApiBase(value: unknown): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/, '');
}

export const resolveApiBase = (): string => {
  // ۱. متغیر محیطی Vite (بالاترین اولویت — برای production)
  const envBase = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);
  if (envBase) return envBase;

  // ۲. متغیر سراسری window (برای override دستی)
  if (typeof window !== 'undefined' && (window as any).AZARMEHR_API_BASE) {
    return normalizeApiBase((window as any).AZARMEHR_API_BASE);
  }

  // ۳. پارامتر URL ?apiBase=...
  if (typeof window !== 'undefined' && window.location) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramBase = urlParams.get('apiBase');
    if (paramBase) return normalizeApiBase(paramBase);

    // ۴. localStorage (برای تنظیم دائمی توسط کاربر)
    const storedBase = localStorage.getItem('AZARMEHR_API_BASE');
    if (storedBase) return normalizeApiBase(storedBase);
  }

  // ۵. پیش‌فرض: same-origin (مسیر نسبی)
  // در development، Vite proxy درخواست /api را به backend می‌فرستد.
  // در production، باید VITE_API_BASE_URL ست شود.
  return '';
};

// ─── مدیریت نشست (توکن و کاربر) ───
const TOKEN_KEY = 'az_token';
const USER_KEY = 'az_user';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const getStoredUser = (): any | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setSession = (token: string, user: any): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// ─── خطای API با وضعیت ───
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// ─── درخواست API با توکن خودکار ───
export const apiFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
  const BASE = resolveApiBase();
  const url = `${BASE}${path.startsWith('/') ? path : '/' + path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });

  // توکن نامعتبر/منقضی → خروج خودکار
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('az:unauthorized'));
    }
    throw new ApiError(401, 'نشست شما منقضی شده است');
  }

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(response.status, body?.error || `خطای سرور (${response.status})`);
  }
  return body;
};

// ─── ورود مدیر ───
export const login = async (username: string, password: string): Promise<any> => {
  const BASE = resolveApiBase();
  const response = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data?.error || 'نام کاربری یا رمز عبور اشتباه است');
  }
  if (!data.token || !data.user) {
    throw new ApiError(500, 'پاسخ سرور نامعتبر است');
  }

  setSession(data.token, data.user);
  return data.user;
};

// ─── خروج ───
export const logout = (): void => {
  clearSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('az:logout'));
  }
};
