// ─────────────────────────────────────────────────────────────────────
// V03 — Helpers académiques purs (cf. ADR-0010 / 0011, LOT 0.6)
// ─────────────────────────────────────────────────────────────────────
// Fonctions PURES (aucune dépendance Prisma ni I/O) partagées backend +
// frontend. Le backend wrappe le fetch ; ces helpers portent la LOGIQUE
// (calcul d'heures, sélection de l'année courante, catégorie d'inscription)
// pour qu'elle soit identique des deux côtés et testable isolément.

/** Heures encadrées saisies dans un MaquetteModule. */
export interface HeuresEncadrees {
  heuresCM: number;
  heuresTD: number;
  heuresTP: number;
}

/** Heures complètes (encadrées + travail personnel encadré). */
export interface HeuresCompletes extends HeuresEncadrees {
  heuresTPE: number;
}

/**
 * VHE — Volume Horaire Encadré = CM + TD + TP (V3-D3 / ADR-0010 §3).
 * Jamais persisté : toujours dérivé des heures saisies.
 */
export function computeVHE(h: HeuresEncadrees): number {
  return h.heuresCM + h.heuresTD + h.heuresTP;
}

/**
 * VHT — Volume Horaire Total = VHE + TPE (V3-D3 / ADR-0010 §3).
 * Jamais persisté : toujours dérivé des heures saisies.
 */
export function computeVHT(h: HeuresCompletes): number {
  return computeVHE(h) + h.heuresTPE;
}

/** État d'une année académique (miroir de l'enum Prisma `AnneeEtat`). */
export type AnneeEtatLike = 'PLANIFIEE' | 'EN_COURS' | 'CLOTUREE' | 'SUSPENDUE';

/** Forme minimale d'une année exploitable par `resolveCurrentYear`. */
export interface AnneeLike {
  etat: AnneeEtatLike | string;
}

/**
 * Année courante = l'unique année `EN_COURS` (V3-D1 / ADR-0010 §1).
 *
 * Fonction pure sur une liste : le backend fournit les années (ex.
 * `prisma.anneeAcademique.findMany()`), ce helper applique la sélection. La
 * base garantit qu'il y en a **au plus une** (index unique partiel) — on
 * renvoie donc la première trouvée, ou `null` si aucune n'est en cours.
 */
export function resolveCurrentYear<T extends AnneeLike>(annees: readonly T[]): T | null {
  return annees.find((a) => a.etat === 'EN_COURS') ?? null;
}

/**
 * Forme minimale d'une formation pour dériver la catégorie d'inscription
 * (ADR-0018 : le drapeau double-diplôme vit sur la **filière**, plus sur la
 * formation). On passe donc la formation **avec sa filière**.
 */
export interface FormationWithFiliereLike {
  filiere: { isDoubleDiplome: boolean };
}

/**
 * Catégorie d'inscription dérivée de la **filière** de la formation de la classe
 * (V3-D7 / ADR-0011 §2, source revue par ADR-0018). Cette valeur est
 * **dénormalisée** sur l'`Inscription` : c'est elle qui alimente le
 * `@@unique([etudiantId, anneeAcademiqueId, isDoubleDiplome])` garantissant
 * « ≤ 2 inscriptions/an, 1 par catégorie ». Helper unique pour que la règle ait
 * une seule source de vérité.
 */
export function isDoubleDiplomeInscription(formation: FormationWithFiliereLike): boolean {
  return formation.filiere.isDoubleDiplome;
}

// ─────────────────────────────────────────────────────────────────────
// Dérivations académiques (ADR-0018) — code formation, nom maquette, semestres
// ─────────────────────────────────────────────────────────────────────

/** Niveaux LMD ordonnés — base du calcul de semestre absolu. */
export const NIVEAUX_ORDONNES = ['L1', 'L2', 'L3', 'M1', 'M2'] as const;
export type NiveauLike = (typeof NIVEAUX_ORDONNES)[number];

/**
 * Code de formation **dérivé** (ADR-0018) : `{SIGLE}-{NIVEAU}-{libelléAnnée}`,
 * ex. `GLRS-L3-2025-2026`. Le RP ne saisit jamais le code à la main.
 */
export function formationCode(args: {
  sigle: string;
  niveau: string;
  anneeLibelle: string;
}): string {
  return `${args.sigle}-${args.niveau}-${args.anneeLibelle}`;
}

/**
 * Libellé de maquette **dérivé** (ADR-0018) : `Maquette {niveau} {sigle}`,
 * ex. `Maquette L1 GLRS`. Auto-composé à la création/renouvellement.
 */
export function maquetteNom(args: { niveau: string; sigle: string }): string {
  return `Maquette ${args.niveau} ${args.sigle}`;
}

/**
 * Numéro de semestre **absolu** dérivé du niveau et du rang (1 | 2) dans
 * l'année (ADR-0018) : L1→S1/S2, L2→S3/S4, L3→S5/S6, M1→S7/S8, M2→S9/S10.
 * `MaquetteModule.semestre` stocke le rang (1|2) ; le numéro absolu est dérivé.
 */
export function semestreAbsolu(niveau: string, rang: 1 | 2): number {
  const idx = NIVEAUX_ORDONNES.indexOf(niveau as NiveauLike);
  const base = (idx < 0 ? 0 : idx) * 2;
  return base + rang;
}

/** Libellé d'un semestre, ex. `S5` (cf. {@link semestreAbsolu}). */
export function semestreLabel(niveau: string, rang: 1 | 2): string {
  return `S${semestreAbsolu(niveau, rang)}`;
}
