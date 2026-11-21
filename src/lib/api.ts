const FALLBACK_PRODUCTION_API_URL = 'https://imfex-crm-backend.onrender.com';

let warnedMissingApiUrl = false;

export const getApiUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV !== 'production' && !warnedMissingApiUrl) {
    warnedMissingApiUrl = true;
    console.warn(
      '[IMFEX] NEXT_PUBLIC_API_URL is not set in environment. Falling back to http://localhost:4000 in development.'
    );
  }
  return process.env.NODE_ENV !== 'production' ? 'http://localhost:4000' : FALLBACK_PRODUCTION_API_URL;
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('imfex_auth_token');
};

type UnauthorizedHandler = () => void;
let onUnauthorizedHandler: UnauthorizedHandler | null = null;

export const registerUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  onUnauthorizedHandler = handler;
};

export const authFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (
    res.status === 401 &&
    typeof window !== 'undefined' &&
    !input.includes('/api/auth/login') &&
    !input.includes('/api/auth/change-password')
  ) {
    onUnauthorizedHandler?.();
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }
  return res;
};
