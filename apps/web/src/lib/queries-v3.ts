import { useQuery } from '@tanstack/react-query';
import {
  type AnneeAcademiqueDto,
  type MaquetteDto,
  type MaquetteVersionDto,
  anneeAcademiqueSchema,
  maquetteSchema,
  maquetteVersionSchema,
} from '@planit/contracts';
import { useAuth } from '@/contexts/auth-context';
import { apiGet } from './api';

// ─────────────────────────────────────────────────────────────────────
// Queries Vague 03 — référentiel académique
// Toutes les queries sont gated sur `state.status === 'authenticated'`
// (pattern clôture V02) pour éviter les 401 au mount.
// ─────────────────────────────────────────────────────────────────────

export const academicKeys = {
  all: ['academic-v3'] as const,
  annees: () => [...academicKeys.all, 'annees'] as const,
  maquettes: () => [...academicKeys.all, 'maquettes'] as const,
  maquette: (id: string) => [...academicKeys.all, 'maquette', id] as const,
  maquetteVersions: (maquetteId: string) =>
    [...academicKeys.all, 'maquette', maquetteId, 'versions'] as const,
  maquetteVersion: (versionId: string) =>
    [...academicKeys.all, 'maquette-version', versionId] as const,
};

const maquetteListSchema = maquetteSchema.array();
const anneeListSchema = anneeAcademiqueSchema.array();
const maquetteVersionListSchema = maquetteVersionSchema.array();

// ── Années académiques ────────────────────────────────────────────────
// Utilisé par AnneesWidget + modal création formation.
// Cache long : les années changent rarement.

export function useAnneesQuery() {
  const { state } = useAuth();
  return useQuery<AnneeAcademiqueDto[]>({
    queryKey: academicKeys.annees(),
    queryFn: () => apiGet('/annees', anneeListSchema),
    enabled: state.status === 'authenticated',
    staleTime: 5 * 60 * 1000,
  });
}

// ── Liste des maquettes (mode lite — sans versions) ──────────────────

export function useMaquettesQuery() {
  const { state } = useAuth();
  return useQuery<MaquetteDto[]>({
    queryKey: academicKeys.maquettes(),
    queryFn: () => apiGet('/maquettes', maquetteListSchema),
    enabled: state.status === 'authenticated',
    staleTime: 60 * 1000,
  });
}

// ── Détail maquette (avec ses versions — mode lite) ───────────────────

export function useMaquetteQuery(id: string | null) {
  const { state } = useAuth();
  return useQuery<MaquetteDto>({
    queryKey: academicKeys.maquette(id ?? ''),
    queryFn: () => apiGet(`/maquettes/${id}`, maquetteSchema),
    enabled: state.status === 'authenticated' && id !== null,
    staleTime: 30 * 1000,
  });
}

// ── Versions d'une maquette ───────────────────────────────────────────

export function useMaquetteVersionsQuery(maquetteId: string | null) {
  const { state } = useAuth();
  return useQuery<MaquetteVersionDto[]>({
    queryKey: academicKeys.maquetteVersions(maquetteId ?? ''),
    queryFn: () => apiGet(`/maquettes/${maquetteId}/versions`, maquetteVersionListSchema),
    enabled: state.status === 'authenticated' && maquetteId !== null,
    staleTime: 30 * 1000,
  });
}

// ── Détail d'une version (avec modules + classes — mode complet) ──────
// Utilisé par le panneau droit pour afficher les semestres.

export function useMaquetteVersionDetailQuery(versionId: string | null) {
  const { state } = useAuth();
  return useQuery<MaquetteVersionDto>({
    queryKey: academicKeys.maquetteVersion(versionId ?? ''),
    queryFn: () => apiGet(`/maquette-versions/${versionId}`, maquetteVersionSchema),
    enabled: state.status === 'authenticated' && versionId !== null,
    staleTime: 30 * 1000,
  });
}
