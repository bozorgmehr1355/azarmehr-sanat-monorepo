export function resolveApiBase(): string {
  if (typeof window !== 'undefined' && (window as any).AZARMEHR_API_BASE) {
    return (window as any).AZARMEHR_API_BASE;
  }
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const queryApiBase = urlParams.get('apiBase');
    if (queryApiBase) return queryApiBase;
    const localApiBase = localStorage.getItem('AZARMEHR_API_BASE');
    if (localApiBase) return localApiBase;
  }
  return 'https://azarmehr-backend.vercel.app';
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const BASE = resolveApiBase();
  const cleanPath = path.startsWith('/') ? path : /admin-panel/index.html;
  const response = await fetch(${BASE}, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return response.json();
}
