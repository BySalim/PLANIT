import { useQuery } from '@tanstack/react-query';
import {
  type AnneeAcademiqueDto,
  type ClasseV3Dto,
  type EtudiantDto,
  type FormationDto,
  type MaquetteDto,
  type MaquetteVersionDto,
  type SuiviModuleDto,
  anneeAcademiqueSchema,
  classeV3Schema,
  etudiantSchema,
  formationSchema,
  maquetteSchema,
  maquetteVersionSchema,
  suiviModuleSchema,
} from '@planit/contracts';
import { useAuth } from '@/contexts/auth-context';
import { apiGet } from './api';

// Filtres de liste — sérialisés dans la queryKey (TanStack gère l'égalité
// structurelle) et en query string. `undefined` = clé absente.
export interface FormationFilters {
  anneeId?: string | undefined;
  filiereId?: string | undefined;
}
export interface ClasseFilters {
  anneeId?: string | undefined;
  filiereSigle?: string | undefined;
  q?: string | undefined;
}

function toQueryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

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
  formations: (filters: FormationFilters) => [...academicKeys.all, 'formations', filters] as const,
  formation: (id: string) => [...academicKeys.all, 'formation', id] as const,
  classes: (filters: ClasseFilters) => [...academicKeys.all, 'classes', filters] as const,
  classe: (id: string) => [...academicKeys.all, 'classe', id] as const,
  classeEtudiants: (id: string) => [...academicKeys.all, 'classe', id, 'etudiants'] as const,
  classeSuivi: (id: string) => [...academicKeys.all, 'classe', id, 'suivi'] as const,
};

const maquetteListSchema = maquetteSchema.array();
const anneeListSchema = anneeAcademiqueSchema.array();
const maquetteVersionListSchema = maquetteVersionSchema.array();
const formationListSchema = formationSchema.array();
const classeListSchema = classeV3Schema.array();
const etudiantListSchema = etudiantSchema.array();
const suiviModuleListSchema = suiviModuleSchema.array();

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

// ── Formations (A.6) ──────────────────────────────────────────────────
// Défaut serveur = année courante quand `anneeId` absent.

export function useFormationsQuery(filters: FormationFilters = {}) {
  const { state } = useAuth();
  return useQuery<FormationDto[]>({
    queryKey: academicKeys.formations(filters),
    queryFn: () =>
      apiGet(
        `/formations${toQueryString({ anneeId: filters.anneeId, filiereId: filters.filiereId })}`,
        formationListSchema,
      ),
    enabled: state.status === 'authenticated',
    staleTime: 30 * 1000,
  });
}

export function useFormationQuery(id: string | null) {
  const { state } = useAuth();
  return useQuery<FormationDto>({
    queryKey: academicKeys.formation(id ?? ''),
    queryFn: () => apiGet(`/formations/${id}`, formationSchema),
    enabled: state.status === 'authenticated' && id !== null,
    staleTime: 30 * 1000,
  });
}

// ── Classes V3 (B.1) ──────────────────────────────────────────────────
// Réponse complète `ClasseV3Dto` (places, filière/niveau hérités). Distinct
// de `useClassesQuery` (queries-v2, schéma lite du séance-picker) — ne pas
// fusionner pour éviter de casser le picker.

export function useClassesV3Query(filters: ClasseFilters = {}) {
  const { state } = useAuth();
  return useQuery<ClasseV3Dto[]>({
    queryKey: academicKeys.classes(filters),
    queryFn: () =>
      apiGet(
        `/classes${toQueryString({
          anneeId: filters.anneeId,
          filiereSigle: filters.filiereSigle,
          q: filters.q,
        })}`,
        classeListSchema,
      ),
    enabled: state.status === 'authenticated',
    staleTime: 30 * 1000,
  });
}

export function useClasseQuery(id: string | null) {
  const { state } = useAuth();
  return useQuery<ClasseV3Dto>({
    queryKey: academicKeys.classe(id ?? ''),
    queryFn: () => apiGet(`/classes/${id}`, classeV3Schema),
    enabled: state.status === 'authenticated' && id !== null,
    staleTime: 30 * 1000,
  });
}

// Roster de la fiche classe (C.4) — étudiants inscrits.
export function useClasseEtudiantsQuery(id: string | null) {
  const { state } = useAuth();
  return useQuery<EtudiantDto[]>({
    queryKey: academicKeys.classeEtudiants(id ?? ''),
    queryFn: () => apiGet(`/classes/${id}/etudiants`, etudiantListSchema),
    enabled: state.status === 'authenticated' && id !== null,
    staleTime: 30 * 1000,
  });
}

// Onglet « Suivi pédagogique » de la fiche classe (C.4) — lecture seule
// (la page Suivi complète avec « Terminer » est le LOT 5).
export function useClasseSuiviQuery(id: string | null) {
  const { state } = useAuth();
  return useQuery<SuiviModuleDto[]>({
    queryKey: academicKeys.classeSuivi(id ?? ''),
    queryFn: () =>
      apiGet(
        `/suivi-modules${toQueryString({ classeId: id ?? undefined })}`,
        suiviModuleListSchema,
      ),
    enabled: state.status === 'authenticated' && id !== null,
    staleTime: 30 * 1000,
  });
}
