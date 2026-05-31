import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub useAuth → authentifié par défaut : les hooks gate désormais sur
// `state.status === 'authenticated'` pour éviter les fetch sortants avant
// que RequireAuth ait redirigé un visiteur non auth (audit Lighthouse
// `errors-in-console`). Les tests vérifient ici le comportement nominal.
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    state: {
      status: 'authenticated',
      user: { id: 'u1', email: 't@x', role: 'RESPONSABLE_PROGRAMME', fullName: 'T' },
    },
  }),
}));

import { planningKeys, useWeekSessionsQuery } from '@/lib/queries';

/**
 * Tests for useWeekSessionsQuery — vérifie la sélection des query keys
 * selon les filtres (student / teacher / no-filter) et l'URL envoyée à fetch.
 */

function wrapper(client: QueryClient): (props: PropsWithChildren) => ReactElement {
  return function Provider({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function buildClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => [],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('useWeekSessionsQuery', () => {
  it('utilise planningKeys.sessions(weekStart) quand aucun filtre acteur', async () => {
    const client = buildClient();
    const weekStart = new Date('2026-05-25T00:00:00.000Z');

    renderHook(() => useWeekSessionsQuery(weekStart), { wrapper: wrapper(client) });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const cached = client.getQueryCache().find({ queryKey: planningKeys.sessions('2026-05-25') });
    expect(cached).toBeDefined();
  });

  it('utilise planningKeys.sessionsByTeacher quand teacherId est fourni', async () => {
    const client = buildClient();
    const weekStart = new Date('2026-05-25T00:00:00.000Z');

    renderHook(() => useWeekSessionsQuery(weekStart, { teacherId: 'teacher-1' }), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const cached = client
      .getQueryCache()
      .find({ queryKey: planningKeys.sessionsByTeacher('2026-05-25', 'teacher-1') });
    expect(cached).toBeDefined();
  });

  it('utilise planningKeys.sessionsByStudent quand studentId est fourni', async () => {
    const client = buildClient();
    const weekStart = new Date('2026-05-25T00:00:00.000Z');

    renderHook(() => useWeekSessionsQuery(weekStart, { studentId: 'student-1' }), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const cached = client
      .getQueryCache()
      .find({ queryKey: planningKeys.sessionsByStudent('2026-05-25', 'student-1') });
    expect(cached).toBeDefined();
  });

  it('appelle /api/sessions avec le param weekStart au format YYYY-MM-DD', async () => {
    const client = buildClient();
    const weekStart = new Date('2026-05-25T00:00:00.000Z');

    renderHook(() => useWeekSessionsQuery(weekStart, { teacherId: 'teacher-1' }), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/api/sessions?');
    expect(url).toContain('weekStart=2026-05-25');
    expect(url).toContain('teacherId=teacher-1');
  });
});

describe('planningKeys', () => {
  it('expose des keys stables et préfixées par "planning"', () => {
    expect(planningKeys.all).toEqual(['planning']);
    expect(planningKeys.sessions('2026-05-25')).toEqual(['planning', 'sessions', '2026-05-25']);
    expect(planningKeys.sessionsByTeacher('2026-05-25', 't1')).toEqual([
      'planning',
      'sessions',
      '2026-05-25',
      'teacher',
      't1',
    ]);
    expect(planningKeys.stats('2026-05-25')).toEqual(['planning', 'stats', '2026-05-25']);
    expect(planningKeys.session('s-42')).toEqual(['planning', 'session', 's-42']);
  });
});
