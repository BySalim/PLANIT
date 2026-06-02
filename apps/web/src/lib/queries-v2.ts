import { useQuery } from '@tanstack/react-query';
import {
  type ClasseRef,
  type EnseignantDto,
  type SalleRef,
  type SessionStatsDto,
  type SessionV2Dto,
  type SettingsDto,
  type UEDto,
  classeRefSchema,
  enseignantSchema,
  salleRefSchema,
  sessionStatsSchema,
  sessionV2Schema,
  settingsSchema,
  ueSchema,
  z,
} from '@planit/contracts';
import { apiGet } from './api';
import { toWeekStartParam } from './week';

// ─────────────────────────────────────────────────────────────────────
// Queries Vague 02 — séances V2 + référentiels (settings, enseignants, UE)
// V01 (`queries.ts`) reste en place tant que la bascule de `/rp` n'est pas
// faite. Les deux jeux de queries coexistent sans interférence (keys séparées).
// ─────────────────────────────────────────────────────────────────────

export const planningV2Keys = {
  all: ['planning-v2'] as const,
  sessions: (weekStart: string) => [...planningV2Keys.all, 'sessions', weekStart] as const,
  sessionsByTeacher: (weekStart: string, teacherId: string) =>
    [...planningV2Keys.all, 'sessions', weekStart, 'teacher', teacherId] as const,
  sessionsByStudent: (weekStart: string, studentId: string) =>
    [...planningV2Keys.all, 'sessions', weekStart, 'student', studentId] as const,
  stats: (weekStart: string) => [...planningV2Keys.all, 'stats', weekStart] as const,
  session: (id: string) => [...planningV2Keys.all, 'session', id] as const,
};

export const referentialKeys = {
  settings: ['settings'] as const,
  enseignants: ['enseignants'] as const,
  ues: ['ues'] as const,
  classes: ['classes'] as const,
  salles: ['salles'] as const,
};

const sessionV2ListSchema = sessionV2Schema.array();
const ueListSchema = ueSchema.array();
const classeRefListSchema = classeRefSchema.array();
const salleRefListSchema = salleRefSchema.array();

// ── Séances V2 (GET /api/v2/sessions?weekStart=&classeId?&teacherId?&studentId?) ──

export function useV2WeekSessionsQuery(
  weekStart: Date,
  options?: { teacherId?: string; studentId?: string; classeId?: string },
) {
  const weekStartParam = toWeekStartParam(weekStart);
  const teacherId = options?.teacherId;
  const studentId = options?.studentId;
  const classeId = options?.classeId;
  const params = new URLSearchParams({ weekStart: weekStartParam });

  let queryKey: readonly unknown[];
  if (studentId !== undefined) {
    params.set('studentId', studentId);
    queryKey = planningV2Keys.sessionsByStudent(weekStartParam, studentId);
  } else if (teacherId !== undefined) {
    params.set('teacherId', teacherId);
    queryKey = planningV2Keys.sessionsByTeacher(weekStartParam, teacherId);
  } else {
    queryKey = planningV2Keys.sessions(weekStartParam);
  }
  if (classeId !== undefined) {
    params.set('classeId', classeId);
  }

  return useQuery<SessionV2Dto[]>({
    queryKey,
    queryFn: () => apiGet(`/v2/sessions?${params.toString()}`, sessionV2ListSchema),
  });
}

// ── Stats V2 (GET /api/v2/sessions/stats?weekStart=&classeId?) ─────────

export function useV2WeekStatsQuery(weekStart: Date, options?: { classeId?: string }) {
  const weekStartParam = toWeekStartParam(weekStart);
  const params = new URLSearchParams({ weekStart: weekStartParam });
  if (options?.classeId !== undefined) {
    params.set('classeId', options.classeId);
  }
  return useQuery<SessionStatsDto>({
    queryKey: planningV2Keys.stats(weekStartParam),
    queryFn: () => apiGet(`/v2/sessions/stats?${params.toString()}`, sessionStatsSchema),
  });
}

// ── Détail séance V2 (GET /api/v2/sessions/:id) ────────────────────────

export function useV2SessionDetailQuery(sessionId: string | null) {
  return useQuery<SessionV2Dto>({
    queryKey: planningV2Keys.session(sessionId ?? ''),
    queryFn: () => apiGet(`/v2/sessions/${sessionId}`, sessionV2Schema),
    enabled: sessionId !== null,
  });
}

// ── Settings (GET /api/settings, public — pas besoin d'auth pour la lecture) ──
// Cache long : 5 min staleTime (V2-D10 — peu de changements en V02 vu que
// l'UI admin de modification est reportée V03).

export function useSettingsQuery() {
  return useQuery<SettingsDto>({
    queryKey: referentialKeys.settings,
    queryFn: () => apiGet(`/settings`, settingsSchema),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Enseignants (GET /api/enseignants — RP only) ───────────────────────
// Le backend renvoie une réponse paginée `{ items, total, page, pageSize }`
// (cf. EnseignantsService.list). Pour le formulaire séance V2 on a besoin
// de la liste complète : on demande `pageSize=200` (clamp serveur) et on
// unwrap `items`. La liste reste petite tant que la seed est < 200
// enseignants ; au-delà il faudra paginer côté UI ou exposer un endpoint
// `/enseignants?all=true` (tech-debt à tracer le moment venu).

const paginatedEnseignantsSchema = z.object({
  items: enseignantSchema.array(),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export function useEnseignantsQuery() {
  return useQuery<EnseignantDto[]>({
    queryKey: referentialKeys.enseignants,
    queryFn: async () => {
      const paginated = await apiGet(`/enseignants?pageSize=200`, paginatedEnseignantsSchema);
      return paginated.items;
    },
    staleTime: 60 * 1000,
  });
}

// ── UE + Modules (GET /api/ues?withModules=true — RP only) ─────────────
// Mode legacy avec modules nested : utilisé par le formulaire séance
// (`<CreateSessionModal>`, `<SessionDetailDrawer>`) qui a besoin de la
// liste aplatie des modules pour son select Module. La page UE & Modules
// utilise un endpoint distinct (queries.ts → useUesQuery, mode lite).

export function useUesQuery() {
  return useQuery<UEDto[]>({
    queryKey: referentialKeys.ues,
    queryFn: () => apiGet(`/ues?withModules=true`, ueListSchema),
    staleTime: 60 * 1000,
  });
}

// ── Classes (GET /api/classes — référentiel partagé tous rôles) ────────
// Utilisé par <ClasseChipsPicker> (LOT 3 R.3). Liste statique sur la
// durée d'une session — staleTime long.

export function useClassesQuery() {
  return useQuery<ClasseRef[]>({
    queryKey: referentialKeys.classes,
    queryFn: () => apiGet(`/classes`, classeRefListSchema),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Salles (GET /api/salles — référentiel partagé tous rôles) ──────────
// Utilisé par le select Salle dans CreateSessionModal + SessionDetailDrawer.
// Mirror exact de useClassesQuery : staleTime long, peu de churn attendu.

export function useSallesQuery() {
  return useQuery<SalleRef[]>({
    queryKey: referentialKeys.salles,
    queryFn: () => apiGet(`/salles`, salleRefListSchema),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Type ré-exporté pour les modules ───────────────────────────────────
// Les pages consommatrices ont rarement besoin de la structure complète
// d'une UE ; on expose un schéma léger pour aplatir [{ ue, module }] si besoin.
export const flatModuleSchema = z.object({
  ueId: z.string(),
  ueLibelle: z.string(),
  moduleId: z.string(),
  moduleCode: z.string(),
  moduleLibelle: z.string(),
  moduleColor: z.string(),
});
export type FlatModule = z.infer<typeof flatModuleSchema>;
