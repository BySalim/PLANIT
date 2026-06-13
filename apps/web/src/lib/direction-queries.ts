import { useQuery } from '@tanstack/react-query';
import {
  personnelSchema,
  anneeAcademiqueSchema,
  salleSchema,
  type PersonnelDto,
  type AnneeAcademiqueDto,
  type SalleDto,
  z,
} from '@planit/contracts';
import { useIsDirection } from '@/hooks/use-role';
import { useAuth } from '@/contexts/auth-context';
import { apiGet } from './api';

// ── Query keys ────────────────────────────────────────────────────────────────

export const personnelKeys = {
  all: ['personnel'] as const,
  list: () => [...personnelKeys.all, 'list'] as const,
};

export const anneesDirectionKeys = {
  all: ['annees-direction'] as const,
  list: () => [...anneesDirectionKeys.all, 'list'] as const,
};

export const sallesDirectionKeys = {
  all: ['salles-direction'] as const,
  list: () => [...sallesDirectionKeys.all, 'list'] as const,
};

// V05 LOT 6 — classes assignées d'un AC (assignation par la Direction).
export const acClassesKeys = {
  all: ['ac-classes'] as const,
  byAc: (acId: string) => [...acClassesKeys.all, acId] as const,
};

// ── Personnel ─────────────────────────────────────────────────────────────────

const personnelListSchema = z.array(personnelSchema);

export function usePersonnelQuery() {
  const isDirection = useIsDirection();
  const { state } = useAuth();
  return useQuery<PersonnelDto[]>({
    queryKey: personnelKeys.list(),
    queryFn: () => apiGet('/personnel', personnelListSchema),
    enabled: isDirection && state.status === 'authenticated',
  });
}

// ── Années (Direction) ────────────────────────────────────────────────────────

const anneesListSchema = z.array(anneeAcademiqueSchema);

export function useAnneesDirectionQuery() {
  const isDirection = useIsDirection();
  const { state } = useAuth();
  return useQuery<AnneeAcademiqueDto[]>({
    queryKey: anneesDirectionKeys.list(),
    queryFn: () => apiGet('/annees', anneesListSchema),
    enabled: isDirection && state.status === 'authenticated',
  });
}

// ── Salles (Direction) ────────────────────────────────────────────────────────

const sallesListSchema = z.array(salleSchema);

export function useSallesDirectionQuery() {
  const isDirection = useIsDirection();
  const { state } = useAuth();
  return useQuery<SalleDto[]>({
    queryKey: sallesDirectionKeys.list(),
    queryFn: () => apiGet('/salles', sallesListSchema),
    enabled: isDirection && state.status === 'authenticated',
  });
}

// ── Classes assignées d'un AC (V05 LOT 6 / ADR-0022 §7) ─────────────────────────

export const acClasseIdsSchema = z.object({ classeIds: z.array(z.string()) });

export function useAcClassesQuery(acId: string | null) {
  const isDirection = useIsDirection();
  const { state } = useAuth();
  return useQuery<{ classeIds: string[] }>({
    queryKey: acClassesKeys.byAc(acId ?? ''),
    queryFn: () => apiGet(`/ac/${acId ?? ''}/classes`, acClasseIdsSchema),
    enabled: isDirection && state.status === 'authenticated' && acId !== null,
  });
}

export type { PersonnelDto, AnneeAcademiqueDto, SalleDto };
