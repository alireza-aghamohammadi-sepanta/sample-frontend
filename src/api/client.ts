export const TOKEN_KEY = 'token';

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
};

type UnauthorizedHandler = (message: string) => void;
let onUnauthorizedHandler: UnauthorizedHandler | null = null;

export const setOnUnauthorized = (handler: UnauthorizedHandler | null): void => {
  onUnauthorizedHandler = handler;
};

const getBaseUrl = (): string => {
  return (import.meta.env?.VITE_API_BASE_URL as string) || '';
};

export const getFullUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return endpoint;
  }
  return `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
};

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getFullUrl(endpoint);
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isAuthAttempt =
    endpoint.includes('/auth/login') ||
    endpoint.endsWith('/login') ||
    endpoint.includes('/signup');

  if (response.status === 401) {
    clearToken();

    let errorDetail = 'Invalid credentials';
    try {
      const data = await response.json();
      if (data && data.detail) {
        errorDetail =
          typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // ignore
    }

    if (!isAuthAttempt) {
      const expirationNotice = 'Session expired. Please log in again.';
      if (onUnauthorizedHandler) {
        onUnauthorizedHandler(expirationNotice);
      } else if (typeof window !== 'undefined' && window.location) {
        sessionStorage.setItem('auth_expiration_message', expirationNotice);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    throw new ApiError(response.status, errorDetail);
  }

  if (!response.ok) {
    let errorDetail = response.statusText || `Request failed with status ${response.status}`;
    let data: any = null;
    try {
      data = await response.json();
      if (data && data.detail) {
        errorDetail =
          typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // ignore
    }
    throw new ApiError(response.status, errorDetail, data);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export const client = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body:
        data !== undefined
          ? typeof data === 'string'
            ? data
            : JSON.stringify(data)
          : undefined,
    }),
  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body:
        data !== undefined
          ? typeof data === 'string'
            ? data
            : JSON.stringify(data)
          : undefined,
    }),
  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body:
        data !== undefined
          ? typeof data === 'string'
            ? data
            : JSON.stringify(data)
          : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
  request,
  setToken,
  getToken,
  clearToken,
  setOnUnauthorized,
};

export const apiClient = client;

export default client;
