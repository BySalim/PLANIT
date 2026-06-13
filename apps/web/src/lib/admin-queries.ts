import { useQuery } from '@tanstack/react-query';
import {
  type AuditLogDto,
  type EcoleDto,
  type UserAdminDto,
  auditLogSchema,
  ecoleSchema,
  userAdminSchema,
  z,
} from '@planit/contracts';
import { useIsAdmin } from '@/hooks/use-role';
import { apiGet } from './api';

// ── Filtres ────────────────────────────────────────────────────────────────
// `| undefined` explicite (exactOptionalPropertyTypes) : les pages passent
// `ecoleId: value || undefined`.
export interface UtilisateurFilters {
  page: number;
  ecoleId?: string | undefined;
  role?: string | undefined;
  statut?: string | undefined;
  q?: string | undefined;
}

export interface JournalFilters {
  page: number;
  ecoleId?: string | undefined;
  action?: string | undefined;
  actorId?: string | undefined;
  q?: string | undefined;
}

// ── Query keys ───────────────────────────────────────────────────────────────
export const ecoleKeys = {
  all: ['ecoles'] as const,
  list: () => [...ecoleKeys.all, 'list'] as const,
};

export const utilisateurKeys = {
  all: ['utilisateurs'] as const,
  list: (filters: UtilisateurFilters) => [...utilisateurKeys.all, 'list', filters] as const,
};

export const journalKeys = {
  all: ['journal'] as const,
  list: (filters: JournalFilters) => [...journalKeys.all, 'list', filters] as const,
};

const PAGE_SIZE = 50;

// ── Écoles ─────────────────────────────────────────────────────────────────
const ecoleListSchema = ecoleSchema.array();

export function useEcolesQuery() {
  const isAdmin = useIsAdmin();
  return useQuery<EcoleDto[]>({
    queryKey: ecoleKeys.list(),
    queryFn: () => apiGet('/ecoles', ecoleListSchema),
    enabled: isAdmin,
  });
}

// ── Utilisateurs (paginé) ────────────────────────────────────────────────────
const userPageSchema = z.object({
  items: userAdminSchema.array(),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type UserPage = z.infer<typeof userPageSchema>;

export function useUtilisateursQuery(filters: UtilisateurFilters) {
  const isAdmin = useIsAdmin();
  const params = new URLSearchParams({ page: String(filters.page), pageSize: String(PAGE_SIZE) });
  if (filters.ecoleId) params.set('ecoleId', filters.ecoleId);
  if (filters.role) params.set('role', filters.role);
  if (filters.statut) params.set('statut', filters.statut);
  if (filters.q) params.set('q', filters.q);
  return useQuery<UserPage>({
    queryKey: utilisateurKeys.list(filters),
    queryFn: () => apiGet(`/utilisateurs?${params.toString()}`, userPageSchema),
    enabled: isAdmin,
  });
}

// ── Journal d'audit (paginé) ─────────────────────────────────────────────────
const auditPageSchema = z.object({
  items: auditLogSchema.array(),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type AuditPage = z.infer<typeof auditPageSchema>;

export function useJournalQuery(filters: JournalFilters) {
  const isAdmin = useIsAdmin();
  const params = new URLSearchParams({ page: String(filters.page), pageSize: String(PAGE_SIZE) });
  if (filters.ecoleId) params.set('ecoleId', filters.ecoleId);
  if (filters.action) params.set('action', filters.action);
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.q) params.set('q', filters.q);
  return useQuery<AuditPage>({
    queryKey: journalKeys.list(filters),
    queryFn: () => apiGet(`/journal?${params.toString()}`, auditPageSchema),
    enabled: isAdmin,
  });
}

export { PAGE_SIZE as ADMIN_PAGE_SIZE };
export type { AuditLogDto, EcoleDto, UserAdminDto };
