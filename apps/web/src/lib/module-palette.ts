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
 * Dérive une palette à partir de la couleur réelle (hex) d'un module : barre
 * pleine, fond clair **opaque**, texte à la couleur du module. Le fond est
 * mélangé au blanc (et non un alpha) — une carte de séance est posée sur la
 * grille, un fond translucide laisserait les lignes d'heures transparaître.
 */
function mixWithWhite(hex: string, ratio: number): string {
  const h = (hex || FALLBACK_COLOR).replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (ch: number) => Math.round(ch * ratio + 255 * (1 - ratio));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function paletteFromHex(hex: string): ModulePaletteEntry {
  const c = hex || FALLBACK_COLOR;
  return { bar: c, bg: mixWithWhite(c, 0.1), border: mixWithWhite(c, 0.32), text: c };
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
