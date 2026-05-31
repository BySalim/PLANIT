import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for useRealtimeSessions — vérifie la connexion socket, la propagation
 * des events session:published vers TanStack Query (invalidations ciblées) et
 * la déconnexion propre. Le module socket.io-client est entièrement mocké.
 */

interface MockSocket {
  on: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit?: (event: string, payload?: unknown) => void;
}

const socketHandlers = new Map<string, (payload?: unknown) => void>();
const mockSocket: MockSocket = {
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
    socketHandlers.set(event, handler);
  }),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Stub minimal du ToastProvider pour ne pas dépendre du composant réel.
vi.mock('@/components/ui/toast-provider', () => {
  const show = vi.fn();
  return {
    useToast: () => ({ show }),
    ToastProvider: ({ children }: { children: ReactNode }) => children,
  };
});

// Stub useAuth → authentifié par défaut. Le hook gate désormais sur
// `state.status === 'authenticated'` (anti-pollution console Lighthouse
// quand le backend n'est pas joignable).
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    state: {
      status: 'authenticated',
      user: { id: 'u1', email: 't@x', role: 'RESPONSABLE_PROGRAMME', fullName: 'T' },
    },
  }),
}));

import { useRealtimeSessions } from '../use-realtime-sessions';
import type { SessionDto } from '@planit/contracts';

function wrapper(client: QueryClient): (props: PropsWithChildren) => ReactElement {
  return function Provider({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function buildSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: 'session-1',
    type: 'CM',
    status: 'PUBLIE',
    startAt: '2026-05-25T10:00:00.000Z',
    endAt: '2026-05-25T12:00:00.000Z',
    isPublished: true,
    lastModifiedAt: '2026-05-25T10:00:00.000Z',
    lastPublishedAt: '2026-05-25T10:00:00.000Z',
    classe: { id: 'classe-1', code: 'GL3-A', name: 'GL3-A' },
    module: { id: 'module-1', code: 'ALGO', name: 'Algorithmique' },
    salle: { id: 'salle-1', name: 'Amphi A' },
    teacher: { id: 'teacher-1', fullName: 'M. Oumar Ndiaye' },
    ...overrides,
  };
}

beforeEach(() => {
  socketHandlers.clear();
  mockSocket.on.mockClear();
  mockSocket.disconnect.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useRealtimeSessions', () => {
  it("n'ouvre pas de socket quand enabled est false", () => {
    const client = new QueryClient();
    renderHook(() => useRealtimeSessions(false), { wrapper: wrapper(client) });

    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it("s'abonne à session:published quand enabled est true", () => {
    const client = new QueryClient();
    renderHook(() => useRealtimeSessions(true), { wrapper: wrapper(client) });

    expect(mockSocket.on).toHaveBeenCalledWith('session:published', expect.any(Function));
  });

  it('déclenche onPublished avec le payload reçu', () => {
    const client = new QueryClient();
    const onPublished = vi.fn();
    renderHook(() => useRealtimeSessions(true, { onPublished, showToast: false }), {
      wrapper: wrapper(client),
    });

    const handler = socketHandlers.get('session:published');
    expect(handler).toBeDefined();
    act(() => {
      handler?.({ sessions: [buildSession()] });
    });

    expect(onPublished).toHaveBeenCalledTimes(1);
  });

  it('invalide les query keys impactées par les sessions reçues', () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useRealtimeSessions(true, { showToast: false }), {
      wrapper: wrapper(client),
    });

    const handler = socketHandlers.get('session:published');
    act(() => {
      handler?.({ sessions: [buildSession()] });
    });

    expect(invalidateSpy).toHaveBeenCalled();
    // Au moins l'invalidation par teacher × weekStart doit être présente.
    const calls = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] }).queryKey,
    );
    const hasTeacherInvalidation = calls.some(
      (key) => key.includes('teacher') && key.includes('teacher-1'),
    );
    expect(hasTeacherInvalidation).toBe(true);
  });

  it('fallback : invalide planningKeys.all quand le payload est vide', () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useRealtimeSessions(true, { showToast: false }), {
      wrapper: wrapper(client),
    });

    const handler = socketHandlers.get('session:published');
    act(() => {
      handler?.({});
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['planning'] });
  });

  it("déconnecte la socket à l'unmount", () => {
    const client = new QueryClient();
    const { unmount } = renderHook(() => useRealtimeSessions(true, { showToast: false }), {
      wrapper: wrapper(client),
    });

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });
});
