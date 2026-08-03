export const resolveApiBase = (): string => {
  if (typeof window !== 'undefined' && (window as any).AZARMEHR_API_BASE) {
    return (window as any).AZARMEHR_API_BASE;
  }
  if (typeof window !== 'undefined' && window.location) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramBase = urlParams.get('apiBase');
    if (paramBase) return paramBase;

    const storedBase = localStorage.getItem('AZARMEHR_API_BASE');
    if (storedBase) return storedBase;
  }
  return 'https://azarmehr-backend.vercel.app';
};

export const apiFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
  const BASE = resolveApiBase();
  const url = `${BASE}${path.startsWith('/') ? path : '/' + path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};