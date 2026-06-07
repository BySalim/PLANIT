import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Smoke-renders every data hook so their bodies + queryFn closures execute
// (key selection, enabled gating, URL building). The detailed key-shape and
// fetch-URL assertions live in query-keys.test.ts / use-week-sessions-query.
// Auth is stubbed authenticated and useIsRp → true so every hook is enabled.

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    state: {
      status: 'authenticated',
      user: { id: 'u1', email: 't@x', role: 'RESPONSABLE_PROGRAMME', fullName: 'T' },
    },
  }),
}));

vi.mock('@/hooks/use-role', () => ({
  useIsRp: () => true,
}));

import * as q1 from '@/lib/queries';
import * as q2 from '@/lib/queries-v2';
import * as q3 from '@/lib/queries-v3';

function wrapper(client: QueryClient): (props: PropsWithChildren) => ReactElement {
  return function Provider({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('data hooks smoke render', () => {
  it('renders every query hook and triggers their fetches', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const week = new Date(2026, 0, 5);
    const filters = { anneeId: 'a1', filiereId: 'f1', filiereSigle: 'GL', q: 'x' };

    renderHook(
      () => {
        // queries.ts (V01)
        q1.useWeekStatsQuery(week);
        q1.useSessionDetailQuery('s1');
        q1.useEnseignantsQuery(1, 'PERMANENT');
        q1.useUesQuery();
        q1.useUeModulesQuery('ue1', { enabled: true });
        q1.useFilieresQuery();
        // queries-v2.ts
        q2.useV2WeekSessionsQuery(week, { teacherId: 't1' });
        q2.useV2WeekStatsQuery(week, { classeId: 'c1' });
        q2.useV2SessionDetailQuery('s1');
        q2.useSettingsQuery();
        q2.useEnseignantsQuery();
        q2.useUesQuery();
        q2.useClassesQuery();
        q2.useSallesQuery();
        // queries-v3.ts
        q3.useAnneesQuery();
        q3.useMaquettesQuery();
        q3.useMaquetteQuery('m1');
        q3.useMaquetteVersionsQuery('m1');
        q3.useMaquetteVersionDetailQuery('v1');
        q3.useFormationsQuery(filters);
        q3.useFormationQuery('fo1');
        q3.useClassesV3Query(filters);
        q3.useClasseQuery('c1');
        q3.useClasseEtudiantsQuery('c1');
        q3.useClasseSuiviQuery('c1');
        q3.useEtudiantsQuery('aw');
        q3.useEtudiantDetailQuery('e1');
        q3.useSuiviModulesQuery({ classeId: 'c1', semestre: 1, statut: 'termine', q: 'a' });
        q3.useStudentSuiviQuery('c1', 2);
        q3.useEnseignantSuiviQuery();
        q3.useSuiviSeancesQuery('su1');
      },
      { wrapper: wrapper(client) },
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    // Many distinct endpoints were hit.
    expect(fetchMock.mock.calls.length).toBeGreaterThan(10);
  });
});
