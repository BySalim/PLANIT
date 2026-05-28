import { useQuery } from '@tanstack/react-query';
import {
  type SessionDto,
  type SessionStatsDto,
  type EnseignantDto,
  type ModuleV2Dto,
  type UEDto,
  type FiliereDto,
  sessionSchema,
  sessionStatsSchema,
  enseignantSchema,
  moduleV2Schema,
  ueSchema,
  filiereSchema,
  z,
} from '@planit/contracts';
import { apiGet } from './api';
import { toWeekStartParam } from './week';

export const planningKeys = {
  all: ['planning'] as const,
  sessions: (weekStart: string) => [...planningKeys.all, 'sessions', weekStart] as const,
  sessionsByTeacher: (weekStart: string, teacherId: string) =>
    [...planningKeys.all, 'sessions', weekStart, 'teacher', teacherId] as const,
  sessionsByStudent: (weekStart: string, studentId: string) =>
    [...planningKeys.all, 'sessions', weekStart, 'student', studentId] as const,
  stats: (weekStart: string) => [...planningKeys.all, 'stats', weekStart] as const,
  session: (id: string) => [...planningKeys.all, 'session', id] as const,
};

const sessionListSchema = sessionSchema.array();

export function useWeekSessionsQuery(
  weekStart: Date,
  options?: { teacherId?: string; studentId?: string },
) {
  const weekStartParam = toWeekStartParam(weekStart);
  const teacherId = options?.teacherId;
  const studentId = options?.studentId;
  const params = new URLSearchParams({ weekStart: weekStartParam });

  let queryKey: readonly string[];
  if (studentId !== undefined) {
    params.set('studentId', studentId);
    queryKey = planningKeys.sessionsByStudent(weekStartParam, studentId);
  } else if (teacherId !== undefined) {
    params.set('teacherId', teacherId);
    queryKey = planningKeys.sessionsByTeacher(weekStartParam, teacherId);
  } else {
    queryKey = planningKeys.sessions(weekStartParam);
  }

  return useQuery<SessionDto[]>({
    queryKey,
    queryFn: () => apiGet(`/sessions?${params.toString()}`, sessionListSchema),
  });
}

export function useWeekStatsQuery(weekStart: Date) {
  const weekStartParam = toWeekStartParam(weekStart);
  return useQuery<SessionStatsDto>({
    queryKey: planningKeys.stats(weekStartParam),
    queryFn: () => apiGet(`/sessions/stats?weekStart=${weekStartParam}`, sessionStatsSchema),
  });
}

export function useSessionDetailQuery(sessionId: string | null) {
  return useQuery<SessionDto>({
    queryKey: planningKeys.session(sessionId ?? ''),
    queryFn: () => apiGet(`/sessions/${sessionId}`, sessionSchema),
    enabled: sessionId !== null,
  });
}

// ── Enseignants ──────────────────────────────────────────────────────

const enseignantPageSchema = z.object({
  items: enseignantSchema.array(),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type EnseignantPage = z.infer<typeof enseignantPageSchema>;

export const enseignantKeys = {
  all: ['enseignants'] as const,
  list: (page: number, statut?: string | undefined) =>
    [...enseignantKeys.all, 'list', page, statut ?? ''] as const,
};

export function useEnseignantsQuery(page: number = 1, statut?: string | undefined) {
  const params = new URLSearchParams({ page: String(page), pageSize: '50' });
  if (statut !== undefined && statut.length > 0) params.set('statut', statut);
  return useQuery<EnseignantPage>({
    queryKey: enseignantKeys.list(page, statut),
    queryFn: () => apiGet(`/enseignants?${params.toString()}`, enseignantPageSchema),
  });
}

// ── UE & Modules ─────────────────────────────────────────────────────

const ueListSchema = ueSchema.array();
const moduleListSchema = moduleV2Schema.array();

export const ueKeys = {
  all: ['ues'] as const,
  list: () => [...ueKeys.all, 'list'] as const,
  modules: (ueId: string) => [...ueKeys.all, 'modules', ueId] as const,
};

/**
 * Liste **lite** des UE — pas de `modules` nested, juste un `moduleCount`
 * pour afficher « X modules » dans l'accordéon. Les modules sont
 * lazy-chargés via `useUeModulesQuery(ueId)` quand l'utilisateur ouvre
 * une UE.
 */
export function useUesQuery() {
  return useQuery<UEDto[]>({
    queryKey: ueKeys.list(),
    queryFn: () => apiGet('/ues', ueListSchema),
    // 30s stale : l'utilisateur peut créer/éditer/supprimer une UE depuis
    // d'autres onglets, mais pas si fréquemment qu'il faille refetch à
    // chaque focus. Les mutations invalident le cache de toute façon.
    staleTime: 30 * 1000,
  });
}

/**
 * Lazy fetch des modules d'une UE. `enabled` est piloté par l'état de
 * l'accordéon dans la page UE & Modules — la requête ne part qu'à
 * l'ouverture, et la donnée reste en cache pour les ouvertures
 * suivantes (pas de re-fetch sauf invalidation par mutation).
 */
export function useUeModulesQuery(ueId: string, options?: { enabled?: boolean }) {
  return useQuery<ModuleV2Dto[]>({
    queryKey: ueKeys.modules(ueId),
    queryFn: () => apiGet(`/ues/${ueId}/modules`, moduleListSchema),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
  });
}

// ── Filières ─────────────────────────────────────────────────────────

const filiereListSchema = filiereSchema.array();

export const filiereKeys = {
  all: ['filieres'] as const,
  list: () => [...filiereKeys.all, 'list'] as const,
};

export function useFilieresQuery() {
  return useQuery<FiliereDto[]>({
    queryKey: filiereKeys.list(),
    queryFn: () => apiGet('/filieres', filiereListSchema),
  });
}
