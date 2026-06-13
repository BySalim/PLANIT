import { z } from 'zod';
import { responsableRefSchema } from '../entities';

// ─────────────────────────────────────────────────────────────────────
// V03 — Référentiel académique (cf. ADR-0010 / 0011 / 0012, LOT 0.5)
// ─────────────────────────────────────────────────────────────────────
// Années académiques · maquettes versionnées · formations · classes (refonte)
// · étudiants · inscriptions (règle double-diplôme) · suivi des modules · salles
// (+ rpResponsable) · scope AC. Importable backend ET frontend.

const cuid = z.string().min(1);
const isoDatetime = z.string().datetime();

// Hex color, e.g. "#3B82F6" — réutilisé pour les modules/UE dans les maquettes.
const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Couleur hex attendue, ex. #3B82F6');

// ── Enums ────────────────────────────────────────────────────────────

export const niveauSchema = z.enum(['L1', 'L2', 'L3', 'M1', 'M2']);
export type Niveau = z.infer<typeof niveauSchema>;

export const anneeEtatSchema = z.enum(['PLANIFIEE', 'EN_COURS', 'CLOTUREE', 'SUSPENDUE']);
export type AnneeEtat = z.infer<typeof anneeEtatSchema>;

// ── Références dénormalisées (embarquées dans les réponses) ───────────

export const filiereRefSchema = z.object({
  id: cuid,
  sigle: z.string(),
  libelle: z.string(),
});
export type FiliereRef = z.infer<typeof filiereRefSchema>;

// Référence module enrichie (UE colorée) — pour l'affichage maquette/suivi.
export const academicModuleRefSchema = z.object({
  id: cuid,
  code: z.string(),
  libelle: z.string(),
  color: hexColor,
  ue: z
    .object({
      id: cuid,
      code: z.string(),
      libelle: z.string(),
      color: hexColor,
    })
    .nullable()
    .optional(),
});
export type AcademicModuleRef = z.infer<typeof academicModuleRefSchema>;

// ─────────────────────────────────────────────────────────────────────
// Année académique (V3-D1 / ADR-0010)
// ─────────────────────────────────────────────────────────────────────

export const anneeAcademiqueSchema = z.object({
  id: cuid,
  libelle: z.string().min(1).max(20), // « 2025-2026 »
  debut: isoDatetime,
  fin: isoDatetime,
  etat: anneeEtatSchema,
});

export const createAnneeAcademiqueSchema = anneeAcademiqueSchema
  .omit({ id: true })
  .extend({ etat: anneeEtatSchema.default('PLANIFIEE') })
  .refine((v) => new Date(v.fin) > new Date(v.debut), {
    message: 'La date de fin doit être postérieure à la date de début',
    path: ['fin'],
  });

// Update partiel — passer une 2ᵉ année à EN_COURS est refusé en base (409, V3-D1).
export const updateAnneeAcademiqueSchema = z.object({
  libelle: z.string().min(1).max(20).optional(),
  debut: isoDatetime.optional(),
  fin: isoDatetime.optional(),
  etat: anneeEtatSchema.optional(),
});

export type AnneeAcademiqueDto = z.infer<typeof anneeAcademiqueSchema>;
export type CreateAnneeAcademiqueDto = z.infer<typeof createAnneeAcademiqueSchema>;
export type UpdateAnneeAcademiqueDto = z.infer<typeof updateAnneeAcademiqueSchema>;

// ─────────────────────────────────────────────────────────────────────
// Maquette / Version / Module (V3-D2/D3 / ADR-0010)
// ─────────────────────────────────────────────────────────────────────

/**
 * Maquette — identité stable d'un plan d'études. Mode lite (par défaut sur
 * `GET /maquettes`) : `versionCount` exposé, `versions` omis. La filière et le
 * niveau sont **figés** après création (cohérence inter-versions) ; seul le nom
 * est modifiable (ADR-0010, conséquences).
 */
export const maquetteSchema = z.object({
  id: cuid,
  nom: z.string().min(1).max(120),
  filiereId: cuid,
  filiere: filiereRefSchema.optional(),
  niveau: niveauSchema,
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  versionCount: z.number().int().min(0).optional(),
  // V05 LOT 4.3 — V5-D5 : RP responsable hérité de la filière.
  responsable: responsableRefSchema.nullable().optional(),
});

// ADR-0018 : la maquette n'est plus créée ni renommée/renouvelée directement.
// Sa création et son renouvellement sont **pilotés par la création de formation**
// (le nom est dérivé « Maquette {niveau} {sigle} » via @planit/utils). Il n'y a
// donc plus de schéma de création/màj public — seul `maquetteSchema` (lecture)
// subsiste.

export type MaquetteDto = z.infer<typeof maquetteSchema>;

/**
 * MaquetteModule — heures **saisies** (CM/TD/TP/TPE) d'un module dans une
 * version, sur un semestre (1 | 2). VHE/VHT (`vhe`/`vht`) sont **dérivés**
 * (computeVHE/VHT, @planit/utils) et inclus en lecture seule — jamais persistés
 * (V3-D3 / ADR-0010 §3).
 */
const heures = z.number().int().min(0).max(500);

export const maquetteModuleSchema = z.object({
  id: cuid,
  maquetteVersionId: cuid,
  moduleId: cuid,
  module: academicModuleRefSchema.optional(),
  semestre: z.number().int().min(1).max(2),
  heuresCM: heures,
  heuresTD: heures,
  heuresTP: heures,
  heuresTPE: heures,
  // Dérivés (réponse uniquement) : VHE = CM+TD+TP ; VHT = VHE+TPE.
  vhe: z.number().int().min(0).optional(),
  vht: z.number().int().min(0).optional(),
});

export const createMaquetteModuleSchema = z.object({
  moduleId: cuid,
  semestre: z.number().int().min(1).max(2),
  heuresCM: heures.default(0),
  heuresTD: heures.default(0),
  heuresTP: heures.default(0),
  heuresTPE: heures.default(0),
});

export const updateMaquetteModuleSchema = z.object({
  semestre: z.number().int().min(1).max(2).optional(),
  heuresCM: heures.optional(),
  heuresTD: heures.optional(),
  heuresTP: heures.optional(),
  heuresTPE: heures.optional(),
});

export type MaquetteModuleDto = z.infer<typeof maquetteModuleSchema>;
export type CreateMaquetteModuleDto = z.infer<typeof createMaquetteModuleSchema>;
export type UpdateMaquetteModuleDto = z.infer<typeof updateMaquetteModuleSchema>;

/**
 * MaquetteVersion — une instance par année. Mode lite : `moduleCount` ;
 * mode complet : `modules` peuplé + `classes` suivant la version (M.6).
 */
export const maquetteVersionSchema = z.object({
  id: cuid,
  maquetteId: cuid,
  anneeAcademiqueId: cuid,
  annee: anneeAcademiqueSchema.pick({ id: true, libelle: true, etat: true }).optional(),
  modules: z.array(maquetteModuleSchema).optional(),
  moduleCount: z.number().int().min(0).optional(),
  // Classes suivant cette version (2ᵉ colonne de la page Maquettes, M.6).
  classes: z.array(z.object({ id: cuid, code: z.string(), name: z.string() })).optional(),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
});

export type MaquetteVersionDto = z.infer<typeof maquetteVersionSchema>;

/**
 * Export d'une version (A.5 → LOT 7) : structure complète pour le rendu
 * image/PDF côté client (maquette + version + modules groupés par semestre +
 * totaux dérivés). Les totaux sont calculés côté backend (sommes de VHE/VHT).
 */
export const maquetteExportSchema = z.object({
  maquette: maquetteSchema,
  version: maquetteVersionSchema,
  modules: z.array(maquetteModuleSchema),
  totaux: z.object({
    cm: z.number().int().min(0),
    td: z.number().int().min(0),
    tp: z.number().int().min(0),
    tpe: z.number().int().min(0),
    vhe: z.number().int().min(0),
    vht: z.number().int().min(0),
  }),
});
export type MaquetteExportDto = z.infer<typeof maquetteExportSchema>;

// ─────────────────────────────────────────────────────────────────────
// Formation (V3-D4 / ADR-0010)
// ─────────────────────────────────────────────────────────────────────

export const formationSchema = z.object({
  id: cuid,
  code: z.string().min(1).max(40),
  niveau: niveauSchema,
  filiereId: cuid,
  filiere: filiereRefSchema.optional(),
  anneeAcademiqueId: cuid,
  anneeLibelle: z.string().optional(),
  maquetteVersionId: cuid,
  classeCount: z.number().int().min(0).optional(),
  // V05 LOT 4.3 — V5-D5 : RP responsable hérité de la filière.
  responsable: responsableRefSchema.nullable().optional(),
});

/**
 * Création (ADR-0018) — le RP choisit seulement **filière + niveau**. Le `code`
 * (`{SIGLE}-{NIVEAU}-{libelléAnnée}`), la maquette `(filière, niveau)` et sa
 * version pour l'année courante (créée ou **renouvelée** depuis l'an passé) sont
 * **dérivés côté serveur**. Plus de champ double-diplôme (porté par la filière).
 */
export const createFormationSchema = z.object({
  niveau: niveauSchema,
  filiereId: cuid,
});

export type FormationDto = z.infer<typeof formationSchema>;
export type CreateFormationDto = z.infer<typeof createFormationSchema>;

// ─────────────────────────────────────────────────────────────────────
// Classe V3 (refonte — V3-D5 / ADR-0010)
// ─────────────────────────────────────────────────────────────────────

export const placesSchema = z.object({
  inscrits: z.number().int().min(0),
  capaciteMax: z.number().int().min(0),
});
export type PlacesDto = z.infer<typeof placesSchema>;

/**
 * Classe V3 — niveau/filière/année/isDoubleDiplome hérités de la **formation**.
 * `places` = inscrits / capaciteMax (V3-D5).
 */
export const classeV3Schema = z.object({
  id: cuid,
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(120),
  niveau: niveauSchema.nullable(),
  filiere: filiereRefSchema.nullable(),
  formationId: cuid.nullable(),
  anneeLibelle: z.string().nullable(),
  isDoubleDiplome: z.boolean(),
  capaciteMax: z.number().int().min(0),
  places: placesSchema,
  // V05 LOT 4.3 — V5-D5 : RP responsable hérité de la formation.filière.
  responsable: responsableRefSchema.nullable().optional(),
});

export const createClasseV3Schema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(120),
  formationId: cuid,
  capaciteMax: z.number().int().min(0).max(1000),
});

export const updateClasseV3Schema = z.object({
  code: z.string().min(1).max(30).optional(),
  name: z.string().min(1).max(120).optional(),
  formationId: cuid.optional(),
  capaciteMax: z.number().int().min(0).max(1000).optional(),
});

export type ClasseV3Dto = z.infer<typeof classeV3Schema>;
export type CreateClasseV3Dto = z.infer<typeof createClasseV3Schema>;
export type UpdateClasseV3Dto = z.infer<typeof updateClasseV3Schema>;

// ─────────────────────────────────────────────────────────────────────
// Étudiant (V3-D6) — lecture/recherche seule, pas de création directe
// ─────────────────────────────────────────────────────────────────────

export const etudiantSchema = z.object({
  id: cuid,
  nomComplet: z.string().min(1).max(120),
  email: z.string().email(),
  matricule: z.string().max(40).nullable(),
});
export type EtudiantDto = z.infer<typeof etudiantSchema>;

// Un item de l'historique d'inscriptions (fiche étudiant, LOT 5 E.3).
export const inscriptionHistoryItemSchema = z.object({
  id: cuid,
  anneeLibelle: z.string(),
  classeId: cuid,
  classeCode: z.string(),
  classeName: z.string(),
  filiereSigle: z.string().nullable(),
  isDoubleDiplome: z.boolean(),
});
export type InscriptionHistoryItemDto = z.infer<typeof inscriptionHistoryItemSchema>;

export const etudiantDetailSchema = etudiantSchema.extend({
  inscriptions: z.array(inscriptionHistoryItemSchema),
});
export type EtudiantDetailDto = z.infer<typeof etudiantDetailSchema>;

// Résultat du lookup par email (préalable à l'inscription — B.3).
export const etudiantLookupSchema = z.object({
  found: z.boolean(),
  etudiant: etudiantSchema.nullable(),
});
export type EtudiantLookupDto = z.infer<typeof etudiantLookupSchema>;

// ─────────────────────────────────────────────────────────────────────
// Inscription (V3-D7 / ADR-0011)
// ─────────────────────────────────────────────────────────────────────

export const inscriptionSchema = z.object({
  id: cuid,
  etudiantId: cuid,
  classeId: cuid,
  anneeAcademiqueId: cuid,
  isDoubleDiplome: z.boolean(),
  createdAt: isoDatetime,
});
export type InscriptionDto = z.infer<typeof inscriptionSchema>;

/**
 * Requête d'inscription — **union discriminée** sur `mode` (flow email, V3-D7) :
 *  - `existant` : l'étudiant doit déjà exister (résolu par lookup) → ajout simple.
 *  - `nouveau`  : crée l'User ETUDIANT (nomComplet + matricule **saisi**) puis
 *    l'inscription, dans une transaction.
 * Même pattern que `createSessionV2Schema` (discriminé sur `type`).
 */
export const inscriptionExistantSchema = z.object({
  mode: z.literal('existant'),
  email: z.string().email(),
});

export const inscriptionNouveauSchema = z.object({
  mode: z.literal('nouveau'),
  email: z.string().email(),
  nomComplet: z.string().min(1).max(120),
  matricule: z.string().min(1).max(40),
});

export const inscriptionRequestSchema = z.discriminatedUnion('mode', [
  inscriptionExistantSchema,
  inscriptionNouveauSchema,
]);
export type InscriptionRequestDto = z.infer<typeof inscriptionRequestSchema>;

// ─────────────────────────────────────────────────────────────────────
// Suivi des modules (V3-D8 / ADR-0012) — tout dérivé sauf estTermine
// ─────────────────────────────────────────────────────────────────────

export const suiviEnseignantSchema = z.object({
  id: cuid,
  nom: z.string(),
  heures: z.number().min(0),
});
export type SuiviEnseignantDto = z.infer<typeof suiviEnseignantSchema>;

// V5-D10 — statut dérivé (`estTermine` + `heuresFaites > 0`)
export const suiviStatutSchema = z.enum(['a_planifier', 'en_cours', 'termine']);
export type SuiviStatut = z.infer<typeof suiviStatutSchema>;

export const suiviModuleSchema = z.object({
  id: cuid,
  classeId: cuid,
  classeCode: z.string().optional(),
  // Niveau de la classe (hérité de sa formation). Affiché en colonne dédiée
  // sur la page Suivi. Nullable : une classe peut ne pas avoir de formation.
  niveau: niveauSchema.nullable(),
  moduleId: cuid,
  module: academicModuleRefSchema,
  semestre: z.number().int().min(1).max(2).nullable(),
  heuresPrevues: z.number().min(0), // VHE
  heuresFaites: z.number().min(0), // dérivé des séances COURS
  progression: z.number().min(0).max(100),
  enseignants: z.array(suiviEnseignantSchema),
  estTermine: z.boolean(),
  // V05 LOT 4.1 — V5-D10 : statut dérivé pour pill colorée + filtre.
  statut: suiviStatutSchema,
  // V05 LOT 4.3 — V5-D5 : RP responsable hérité de classe.formation.filiere.
  responsable: responsableRefSchema.nullable(),
});
export type SuiviModuleDto = z.infer<typeof suiviModuleSchema>;

// Filtres de la page Suivi (B.5).
export const suiviModuleQuerySchema = z.object({
  classeId: cuid.optional(),
  semestre: z.coerce.number().int().min(1).max(2).optional(),
  statut: z.enum(['termine', 'en_cours', 'a_planifier']).optional(),
  q: z.string().max(120).optional(),
});
export type SuiviModuleQueryDto = z.infer<typeof suiviModuleQuerySchema>;

// Pivot enseignant (S.3 / V3-D15) — GET /api/suivi-modules/mes-enseignements
export const enseignantSuiviClasseItemSchema = z.object({
  classeId: z.string(),
  classeCode: z.string(),
  className: z.string(),
  heuresFaites: z.number().min(0),
  heuresCM: z.number().min(0),
  heuresTD: z.number().min(0),
  heuresTP: z.number().min(0),
  heuresPrevues: z.number().min(0),
  progression: z.number().min(0).max(100),
  sessionsCount: z.number().int().min(0),
  estTermine: z.boolean(),
});
export type EnseignantSuiviClasseItemDto = z.infer<typeof enseignantSuiviClasseItemSchema>;

export const enseignantSuiviItemSchema = z.object({
  moduleId: z.string(),
  module: z.object({
    id: z.string(),
    code: z.string(),
    libelle: z.string(),
    color: z.string(),
    ue: z.object({ id: z.string(), code: z.string(), libelle: z.string() }).nullable(),
  }),
  classes: z.array(enseignantSuiviClasseItemSchema),
  status: z.enum(['completed', 'ongoing', 'upcoming']),
});
export type EnseignantSuiviItemDto = z.infer<typeof enseignantSuiviItemSchema>;

// ─────────────────────────────────────────────────────────────────────
// Salle (+ rpResponsable — V3-D10)
// ─────────────────────────────────────────────────────────────────────

export const salleSchema = z.object({
  id: cuid,
  name: z.string().min(1).max(80),
  type: z.string().min(1).max(60),
  capacity: z.number().int().min(0),
  rpResponsable: z.object({ id: cuid, fullName: z.string() }).nullable(),
});

export const createSalleSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.string().min(1).max(60),
  capacity: z.number().int().min(0).max(10000),
  rpResponsableId: cuid.nullable().optional(),
});

export const updateSalleSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  type: z.string().min(1).max(60).optional(),
  capacity: z.number().int().min(0).max(10000).optional(),
  rpResponsableId: cuid.nullable().optional(),
});

export type SalleDto = z.infer<typeof salleSchema>;
export type CreateSalleDto = z.infer<typeof createSalleSchema>;
export type UpdateSalleDto = z.infer<typeof updateSalleSchema>;

// V05 LOT 4.4 — liste des salles enrichie (responsable + commune dérivée).
export const salleListSchema = z.array(salleSchema);

// ─────────────────────────────────────────────────────────────────────
// Scope AC (V3-D9 / ADR-0010) — périmètre d'un Attaché de Classe
// ─────────────────────────────────────────────────────────────────────

/**
 * Périmètre d'un AC : ses classes assignées + les salles dont son RP manager
 * est responsable (`GET /api/ac/me/scope`, B.7). Filtrage backend systématique
 * (jamais un simple masquage UI).
 */
export const acScopeSchema = z.object({
  classes: z.array(z.object({ id: cuid, code: z.string(), name: z.string() })),
  salles: z.array(z.object({ id: cuid, name: z.string() })),
});
export type AcScopeDto = z.infer<typeof acScopeSchema>;

// Assignation d'une classe à un AC par son RP (POST /api/ac/:acId/classes, B.7).
export const assignAcClasseSchema = z.object({
  classeId: cuid,
});
export type AssignAcClasseDto = z.infer<typeof assignAcClasseSchema>;
