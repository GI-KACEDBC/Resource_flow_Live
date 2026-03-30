import axios from 'axios';

/**
 * Same-origin base URL in dev (Vite proxies `/api` and `/sanctum`) so Sanctum session cookies work.
 * `withCredentials` sends cookies; `withXSRFToken` pairs with Laravel `XSRF-TOKEN` for CSRF on mutating routes.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

/**
 * Laravel issues the CSRF cookie from `/sanctum/csrf-cookie`; call this before login/register or first POST.
 */
export async function fetchSanctumCsrfCookie(): Promise<void> {
  const base = String(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '') || '';
  await axios.get(`${base}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
  });
}

apiClient.interceptors.request.use((config) => {
  // Let the browser set multipart boundaries; a preset Content-Type breaks file uploads.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.error_code === 'PASSWORD_EXPIRED') {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?password_expired=1';
      }
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (path.startsWith('/dashboard') || path.startsWith('/verification-wait')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
