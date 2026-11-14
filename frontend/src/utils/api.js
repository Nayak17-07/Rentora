/**
 * API Utility Module
 * Provides centralized URL resolution, automatic JWT token management,
 * silent refresh tokens, and network fallback between localhost/127.0.0.1/proxy.
 */

export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ? import.meta.env.VITE_API_URL : '';

/**
 * Normalizes any relative or localhost URL into the canonical API route.
 * Handles Vite proxy in dev (/api/...) and explicit VITE_API_URL in production.
 */
export const getApiUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/')) {
    return API_BASE ? `${API_BASE}${url}` : url;
  }
  if (url.includes('localhost:8000') || url.includes('127.0.0.1:8000')) {
    const relative = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/, '');
    return API_BASE ? `${API_BASE}${relative}` : relative;
  }
  return url;
};

/**
 * publicFetch - Wraps standard fetch with dynamic URL resolution and fallback.
 */
export const publicFetch = async (url, options = {}) => {
  const normalizedUrl = getApiUrl(url);
  try {
    return await fetch(normalizedUrl, {
      credentials: 'include',
      ...options,
    });
  } catch (netErr) {
    if (typeof normalizedUrl === 'string' && normalizedUrl.startsWith('/api')) {
      try {
        return await fetch(`http://127.0.0.1:8000${normalizedUrl}`, {
          credentials: 'include',
          ...options,
        });
      } catch (e2) {
        return await fetch(`http://localhost:8000${normalizedUrl}`, {
          credentials: 'include',
          ...options,
        });
      }
    }
    throw netErr;
  }
};

/**
 * fetchWithAuth - Wraps fetch() with automatic JWT access-token injection,
 * silent token refresh, and multi-endpoint fallback.
 */
export const fetchWithAuth = async (url, options = {}) => {
  let token = localStorage.getItem('access_token');

  const buildHeaders = (t) => {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };
    if (t && t !== 'null' && t !== 'undefined') {
      headers['Authorization'] = `Bearer ${t}`;
    }
    return headers;
  };

  const executeFetch = async (targetUrl) => {
    const normalizedUrl = getApiUrl(targetUrl);
    try {
      return await fetch(normalizedUrl, {
        credentials: 'include',
        ...options,
        headers: buildHeaders(token),
      });
    } catch (netErr) {
      if (typeof normalizedUrl === 'string' && normalizedUrl.startsWith('/api')) {
        try {
          return await fetch(`http://127.0.0.1:8000${normalizedUrl}`, {
            credentials: 'include',
            ...options,
            headers: buildHeaders(token),
          });
        } catch (e2) {
          return await fetch(`http://localhost:8000${normalizedUrl}`, {
            credentials: 'include',
            ...options,
            headers: buildHeaders(token),
          });
        }
      }
      throw netErr;
    }
  };

  let response = await executeFetch(url);

  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken) {
      try {
        let refreshRes = null;
        const refreshBody = JSON.stringify({ refresh: refreshToken });
        const refreshOpts = {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: refreshBody
        };

        const refreshUrl = getApiUrl('/api/token/refresh/');
        try {
          refreshRes = await fetch(refreshUrl, refreshOpts);
        } catch (e1) {
          try {
            refreshRes = await fetch('http://127.0.0.1:8000/api/token/refresh/', refreshOpts);
          } catch (e2) {
            refreshRes = await fetch('http://localhost:8000/api/token/refresh/', refreshOpts).catch(() => null);
          }
        }

        if (refreshRes && refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('access_token', data.access);
          if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
          token = data.access;

          // Retry original request with fresh token
          response = await executeFetch(url);
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/session-expired';
        }
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/session-expired';
      }
    } else {
      localStorage.removeItem('access_token');
      window.location.href = '/session-expired';
    }
  }

  return response;
};
