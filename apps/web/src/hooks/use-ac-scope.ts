'use client';

import { useQuery } from '@tanstack/react-query';
import { acScopeSchema, type AcScopeDto } from '@planit/contracts';
import { apiGet } from '@/lib/api';
import { useIsAc } from './use-role';

export const acKeys = {
  all: ['ac'] as const,
  scope: () => [...acKeys.all, 'scope'] as const,
};

/**
 * Périmètre de l'AC connecté (B.7 — `GET /api/ac/me/scope`) : classes assignées
 * + salles dont son RP manager est responsable. Source de vérité pour la page
 * Salles (G.6) et le compteur classes du dashboard placeholder (G.7).
 *
 * `enabled` = AC connecté uniquement. Pour un RP / étudiant / enseignant, le
 * hook retourne `{ data: undefined, isLoading: false }` sans déclencher de fetch
 * (et donc sans 403 inutile côté backend).
 */
export function useAcScope() {
  const isAc = useIsAc();
  return useQuery<AcScopeDto>({
    queryKey: acKeys.scope(),
    queryFn: () => apiGet('/ac/me/scope', acScopeSchema),
    enabled: isAc,
    staleTime: 60_000,
  });
}
