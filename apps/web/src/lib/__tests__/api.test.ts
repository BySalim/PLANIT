import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiDelete, apiGet, apiPost } from '../api';

// Pure-logic tests for the fetch wrapper: success/parse, error shaping, the
// 401→refresh→retry singleton, refresh failure → redirect, and the 403 event.

interface FakeResponseInit {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
}

function makeResponse({ ok, status, json, text }: FakeResponseInit): Response {
  return {
    ok,
    status,
    json: async () => {
      if (json === undefined) throw new Error('no json');
      return json;
    },
    text: async () => text ?? '',
  } as unknown as Response;
}

const passParser = { safeParse: (raw: unknown) => ({ success: true as const, data: raw }) };
const failParser = {
  safeParse: (_raw: unknown) => ({ success: false as const, error: 'shape' }),
};

let fetchMock: ReturnType<typeof vi.fn>;
let locationStub: { href: string };
let originalLocation: Location;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  originalLocation = window.location;
  locationStub = { href: '' };
  Object.defineProperty(window, 'location', { configurable: true, value: locationStub });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  vi.restoreAllMocks();
});

describe('apiGet', () => {
  it('returns parsed data on a 200 response', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true, status: 200, json: { a: 1 } }));
    await expect(apiGet('/things', passParser)).resolves.toEqual({ a: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/things',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws ApiError when the response shape does not match', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true, status: 200, json: { a: 1 } }));
    await expect(apiGet('/things', failParser)).rejects.toBeInstanceOf(ApiError);
  });

  it('throws ApiError with the parsed detail on a non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse({ ok: false, status: 500, json: { message: 'boom' } }),
    );
    await expect(apiGet('/things', passParser)).rejects.toMatchObject({
      status: 500,
      cause: { message: 'boom' },
    });
  });
});

describe('401 refresh flow', () => {
  it('refreshes once then replays the original request', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse({ ok: false, status: 401 })) // initial
      .mockResolvedValueOnce(makeResponse({ ok: true, status: 200 })) // refresh
      .mockResolvedValueOnce(makeResponse({ ok: true, status: 200, json: { ok: true } })); // replay

    await expect(apiGet('/secure', passParser)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('redirects to /login and throws when the refresh fails', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse({ ok: false, status: 401 })) // initial
      .mockResolvedValueOnce(makeResponse({ ok: false, status: 401 })); // refresh fails

    await expect(apiGet('/secure', passParser)).rejects.toMatchObject({ status: 401 });
    expect(locationStub.href).toBe('/login');
  });
});

describe('403 forbidden event', () => {
  it('dispatches api:forbidden on a 403', async () => {
    const listener = vi.fn();
    window.addEventListener('api:forbidden', listener);
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: false, status: 403, json: {} }));
    await expect(apiPost('/secure', passParser, { x: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('api:forbidden', listener);
  });
});

describe('apiDelete', () => {
  it('resolves on a 2xx response', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true, status: 204 }));
    await expect(apiDelete('/things/1')).resolves.toBeUndefined();
  });

  it('throws ApiError and dispatches the event on a 403', async () => {
    const listener = vi.fn();
    window.addEventListener('api:forbidden', listener);
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: false, status: 403 }));
    await expect(apiDelete('/things/1')).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('api:forbidden', listener);
  });
});
