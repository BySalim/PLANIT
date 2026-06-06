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

/** Forme minimale d'une formation pour dériver la catégorie d'inscription. */
export interface FormationLike {
  isDoubleDiplome: boolean;
}

/**
 * Catégorie d'inscription dérivée de la formation de la classe (V3-D7 /
 * ADR-0011 §2). Cette valeur est **dénormalisée** sur l'`Inscription` :
 * c'est elle qui alimente le `@@unique([etudiantId, anneeAcademiqueId,
 * isDoubleDiplome])` garantissant « ≤ 2 inscriptions/an, 1 par catégorie ».
 * Helper unique pour que la règle ait une seule source de vérité.
 */
export function isDoubleDiplomeInscription(formation: FormationLike): boolean {
  return formation.isDoubleDiplome;
}
