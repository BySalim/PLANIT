export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api';

export interface ResponseParser<T> {
  safeParse(raw: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export class ApiError extends Error {
  readonly status: number;
  readonly cause?: unknown;

  constructor(message: string, status: number, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.cause = cause;
  }
}

// Singleton anti-race : une seule tentative de refresh simultanée
let pendingRefresh: Promise<void> | null = null;

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  parser: ResponseParser<T>,
  body?: unknown,
  retried = false,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    // V02 LOT 1 : les endpoints sont protégés par cookies HttpOnly (ADR-0007 §2).
    // `credentials: 'include'` est requis pour que le navigateur envoie les
    // cookies sur les requêtes cross-origin (front :3000 → backend :3001).
    credentials: 'include',
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);

  if (!response.ok) {
    // 401 : tente un refresh une fois, puis rejoue
    if (response.status === 401 && !retried) {
      if (pendingRefresh === null) {
        pendingRefresh = fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
          .then((r) => {
            if (!r.ok) throw new Error('refresh_failed');
          })
          .finally(() => {
            pendingRefresh = null;
          });
      }
      try {
        await pendingRefresh;
        return request(method, path, parser, body, true);
      } catch {
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new ApiError('Session expirée', 401);
      }
    }

    // 403 : dispatch event capté par ForbiddenListener
    if (response.status === 403 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api:forbidden'));
    }

    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new ApiError(
      `API ${method} ${path} failed (${response.status})`,
      response.status,
      detail,
    );
  }

  const raw = await response.json();
  const parsed = parser.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      `API ${method} ${path} response shape mismatch`,
      response.status,
      parsed.error,
    );
  }
  return parsed.data;
}

export function apiGet<T>(path: string, parser: ResponseParser<T>): Promise<T> {
  return request('GET', path, parser);
}

export function apiPost<T>(path: string, parser: ResponseParser<T>, body?: unknown): Promise<T> {
  return request('POST', path, parser, body);
}

export function apiPut<T>(path: string, parser: ResponseParser<T>, body?: unknown): Promise<T> {
  return request('PUT', path, parser, body);
}
