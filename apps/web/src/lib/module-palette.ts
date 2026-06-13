import type { SessionType, SessionTypeV2 } from '@planit/contracts';

/**
 * Palette d'une séance.
 *   cours      → couleur RÉELLE du module (héritée, jamais hashée)
 *   evaluation → rouge (réservé)
 *   evenement  → violet (réservé)
 */
export interface ModulePaletteEntry {
  bar: string;
  bg: string;
  border: string;
  text: string;
}

/** Teinte réservée évaluation (rouge) / événement (violet). */
const EVALUATION_PALETTE: ModulePaletteEntry = {
  bar: '#DC2626',
  bg: '#FEE2E2',
  border: '#FCA5A5',
  text: '#7F1D1D',
};
const EVENEMENT_PALETTE: ModulePaletteEntry = {
  bar: '#7C3AED',
  bg: '#EDE9FE',
  border: '#C4B5FD',
  text: '#5B21B6',
};

/** Couleur neutre si un module n'a pas (encore) de couleur. */
const FALLBACK_COLOR = '#64748B';

/**
 * Dérive une palette à partir de la couleur réelle (hex) d'un module — même
 * principe que les chips maquette/suivi : barre pleine, fond très clair (alpha),
 * texte à la couleur du module. On n'attribue jamais de couleur arbitraire.
 */
export function paletteFromHex(hex: string): ModulePaletteEntry {
  const c = hex || FALLBACK_COLOR;
  return { bar: c, bg: `${c}14`, border: `${c}33`, text: c };
}

export type SessionCategory = 'cours' | 'evaluation' | 'evenement';

export function categoryForType(type: SessionType): SessionCategory {
  if (type === 'EXAM' || type === 'RATTRAP' || type === 'DEVOIR') return 'evaluation';
  if (type === 'EVENT') return 'evenement';
  return 'cours';
}

export function categoryForTypeV2(type: SessionTypeV2): SessionCategory {
  if (type === 'EVALUATION') return 'evaluation';
  if (type === 'EVENEMENT') return 'evenement';
  return 'cours';
}

/**
 * Palette à appliquer sur une séance V01 : cours → couleur du module,
 * évaluation → rouge, événement → violet.
 */
export function paletteForSession(
  moduleColor: string | null | undefined,
  type: SessionType,
): ModulePaletteEntry {
  const cat = categoryForType(type);
  if (cat === 'evaluation') return EVALUATION_PALETTE;
  if (cat === 'evenement') return EVENEMENT_PALETTE;
  return paletteFromHex(moduleColor ?? FALLBACK_COLOR);
}

/** Idem V02 (types top-level COURS / EVALUATION / EVENEMENT). */
export function paletteForSessionV2(
  moduleColor: string | null | undefined,
  type: SessionTypeV2,
): ModulePaletteEntry {
  const cat = categoryForTypeV2(type);
  if (cat === 'evaluation') return EVALUATION_PALETTE;
  if (cat === 'evenement') return EVENEMENT_PALETTE;
  return paletteFromHex(moduleColor ?? FALLBACK_COLOR);
}
