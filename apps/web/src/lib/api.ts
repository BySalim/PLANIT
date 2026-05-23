export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

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

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  parser: ResponseParser<T>,
  body?: unknown,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);

  if (!response.ok) {
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
