import { useQuery } from '@tanstack/react-query';
import {
  type AnneeAcademiqueDto,
  type ClasseV3Dto,
  type EtudiantDetailDto,
  type EtudiantDto,
  type FormationDto,
  type MaquetteDto,
  type MaquetteVersionDto,
  type SessionV2Dto,
  type SuiviModuleDto,
  type SuiviModuleQueryDto,
  anneeAcademiqueSchema,
  classeV3Schema,
  etudiantDetailSchema,
  etudiantSchema,
  formationSchema,
  maquetteSchema,
  maquetteVersionSchema,
  sessionV2Schema,
  suiviModuleSchema,
  z,
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
  // LOT 4 V03 (Oumy)
  formations: (filters: FormationFilters) => [...academicKeys.all, 'formations', filters] as const,
  formation: (id: string) => [...academicKeys.all, 'formation', id] as const,
  classes: (filters: ClasseFilters) => [...academicKeys.all, 'classes', filters] as const,
  classe: (id: string) => [...academicKeys.all, 'classe', id] as const,
  classeEtudiants: (id: string) => [...academicKeys.all, 'classe', id, 'etudiants'] as const,
  classeSuivi: (id: string) => [...academicKeys.all, 'classe', id, 'suivi'] as const,
  // LOT 5 V03 (Libasse)
  etudiants: (q: string) => [...academicKeys.all, 'etudiants', { q }] as const,
  etudiant: (id: string) => [...academicKeys.all, 'etudiant', id] as const,
  suiviModules: (query: SuiviModuleQueryDto) =>
    [...academicKeys.all, 'suivi-modules', query] as const,
  suiviSeances: (suiviId: string) =>
    [...academicKeys.all, 'suivi-modules', suiviId, 'seances'] as const,
};

const maquetteListSchema = maquetteSchema.array();
const anneeListSchema = anneeAcademiqueSchema.array();
const maquetteVersionListSchema = maquetteVersionSchema.array();
const formationListSchema = formationSchema.array();
const classeListSchema = classeV3Schema.array();
const etudiantListSchema = etudiantSchema.array();
const suiviModuleListSchema = suiviModuleSchema.array();
const sessionV2ListSchema = sessionV2Schema.array();

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

// ── LOT 5 V03 — Étudiants ─────────────────────────────────────────────
// Recherche par nom / matricule / email (backend `?q=`). Le cache distingue
// chaque requête (cache key inclut `q`) pour éviter qu'un re-render
// avec `q=""` n'écrase un cache filtré.

export function useEtudiantsQuery(q: string) {
  const { state } = useAuth();
  return useQuery<EtudiantDto[]>({
    queryKey: academicKeys.etudiants(q),
    queryFn: () => {
      const qs = q.length > 0 ? `?q=${encodeURIComponent(q)}` : '';
      return apiGet(`/etudiants${qs}`, etudiantListSchema);
    },
    enabled: state.status === 'authenticated',
    staleTime: 30 * 1000,
  });
}

// Fiche étudiant : identité + historique d'inscriptions (E.3).

export function useEtudiantDetailQuery(id: string | null) {
  const { state } = useAuth();
  return useQuery<EtudiantDetailDto>({
    queryKey: academicKeys.etudiant(id ?? ''),
    queryFn: () => apiGet(`/etudiants/${id}`, etudiantDetailSchema),
    enabled: state.status === 'authenticated' && id !== null,
    staleTime: 30 * 1000,
  });
}

// ── LOT 5 V03 — Suivi des modules ────────────────────────────────────
// Le backend reçoit tous les filtres (classeId/semestre/statut/q). Cache
// par tuple de filtres pour permettre la navigation rapide entre filtres.

export function useSuiviModulesQuery(query: SuiviModuleQueryDto) {
  const { state } = useAuth();
  return useQuery<SuiviModuleDto[]>({
    queryKey: academicKeys.suiviModules(query),
    queryFn: () => {
      const params = new URLSearchParams();
      if (query.classeId !== undefined) params.set('classeId', query.classeId);
      if (query.semestre !== undefined) params.set('semestre', String(query.semestre));
      if (query.statut !== undefined) params.set('statut', query.statut);
      if (query.q !== undefined && query.q.length > 0) params.set('q', query.q);
      const qs = params.toString();
      return apiGet(`/suivi-modules${qs ? `?${qs}` : ''}`, suiviModuleListSchema);
    },
    enabled: state.status === 'authenticated',
    staleTime: 30 * 1000,
  });
}

// ── LOT 9 — Suivi Étudiant (S.4 — lit la même API, self-scope géré backend) ─
// Alias sémantique de useSuiviModulesQuery — le backend filtrera sur les classes
// de l'étudiant connecté une fois S.2 livré. Séparé pour permettre
// une queryKey distincte (pas de cache partagé avec la vue RP).

export const studentSuiviKeys = {
  all: ['student-suivi'] as const,
  suivi: (classeId?: string, semestre?: 1 | 2) =>
    [...studentSuiviKeys.all, classeId ?? 'all', semestre ?? 'all'] as const,
};

export function useStudentSuiviQuery(classeId?: string, semestre?: 1 | 2) {
  const { state } = useAuth();
  const params = new URLSearchParams();
  if (classeId !== undefined) params.set('classeId', classeId);
  if (semestre !== undefined) params.set('semestre', String(semestre));
  const qs = params.toString();
  return useQuery<SuiviModuleDto[]>({
    queryKey: studentSuiviKeys.suivi(classeId, semestre),
    queryFn: () => apiGet(`/suivi-modules${qs ? `?${qs}` : ''}`, suiviModuleListSchema),
    enabled: state.status === 'authenticated',
    staleTime: 60 * 1000,
  });
}

// ── LOT 9 — Suivi Enseignant (S.5 — endpoint pivot S.3, stub jusqu'à livraison) ─
// L'endpoint `GET /api/suivi-modules/mes-enseignements` sera livré en S.3.
// On prépare le hook maintenant ; il retournera 404/403 tant que S.3 n'est pas mergé.

export interface EnseignantSuiviClasseItem {
  classeId: string;
  classeCode: string;
  className: string;
  heuresFaites: number;
  heuresCM: number;
  heuresTD: number;
  heuresTP: number;
  heuresPrevues: number;
  progression: number;
  sessionsCount: number;
  estTermine: boolean;
}

export interface EnseignantSuiviItem {
  moduleId: string;
  module: {
    id: string;
    code: string;
    libelle: string;
    color: string;
    ue: { id: string; code: string; libelle: string } | null;
  };
  classes: EnseignantSuiviClasseItem[];
  status: 'completed' | 'ongoing' | 'upcoming';
}

const enseignantSuiviClasseSchema = z.object({
  classeId: z.string(),
  classeCode: z.string(),
  className: z.string(),
  heuresFaites: z.number(),
  heuresCM: z.number(),
  heuresTD: z.number(),
  heuresTP: z.number(),
  heuresPrevues: z.number(),
  progression: z.number(),
  sessionsCount: z.number(),
  estTermine: z.boolean(),
});

const enseignantSuiviItemSchema = z.object({
  moduleId: z.string(),
  module: z.object({
    id: z.string(),
    code: z.string(),
    libelle: z.string(),
    color: z.string(),
    ue: z.object({ id: z.string(), code: z.string(), libelle: z.string() }).nullable(),
  }),
  classes: z.array(enseignantSuiviClasseSchema),
  status: z.enum(['completed', 'ongoing', 'upcoming']),
});

const enseignantSuiviListSchema = z.array(enseignantSuiviItemSchema);

export const enseignantSuiviKeys = {
  all: ['enseignant-suivi'] as const,
  suivi: () => [...enseignantSuiviKeys.all, 'mes-enseignements'] as const,
};

export function useEnseignantSuiviQuery() {
  const { state } = useAuth();
  return useQuery<EnseignantSuiviItem[]>({
    queryKey: enseignantSuiviKeys.suivi(),
    queryFn: () => apiGet('/suivi-modules/mes-enseignements', enseignantSuiviListSchema),
    enabled: state.status === 'authenticated',
    staleTime: 60 * 1000,
  });
}

// E.5 — Séances COURS d'un module suivi (lecture lazy, drawer).

export function useSuiviSeancesQuery(suiviId: string | null) {
  const { state } = useAuth();
  return useQuery<SessionV2Dto[]>({
    queryKey: academicKeys.suiviSeances(suiviId ?? ''),
    queryFn: () => apiGet(`/suivi-modules/${suiviId}/seances`, sessionV2ListSchema),
    enabled: state.status === 'authenticated' && suiviId !== null,
    staleTime: 60 * 1000,
  });
}
