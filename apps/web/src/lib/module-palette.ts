import type { SessionType } from '@planit/contracts';

/**
 * 6 teintes module — source : PLANIT-IA/rp/shared/tokens-ext.js (window.PALETTES).
 * red et purple sont **réservés** :
 *   red    → catégorie "evaluation" (EXAM, RATTRAP, DEVOIR)
 *   purple → catégorie "evenement"  (EVENT)
 * Aucun module ne doit donc se voir attribuer red ou purple.
 */
export type ModuleColor = 'brown' | 'blue' | 'green' | 'red' | 'orange' | 'purple';

export interface ModulePaletteEntry {
  bar: string;
  bg: string;
  border: string;
  text: string;
}

export const MODULE_PALETTES: Record<ModuleColor, ModulePaletteEntry> = {
  brown: { bar: '#6B2D0E', bg: '#FCF7F4', border: '#E8C9B0', text: '#5A2509' },
  blue: { bar: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
  green: { bar: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
  red: { bar: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', text: '#7F1D1D' },
  orange: { bar: '#E8620A', bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
  purple: { bar: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6' },
};

const ASSIGNABLE_COLORS: ModuleColor[] = ['brown', 'blue', 'green', 'orange'];

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Couleur stable assignée à un module à partir de son id. V1 utilise un hash
 * déterministe en attendant que le contrat expose `module.color` (TD-015).
 */
export function colorForModule(moduleId: string): ModuleColor {
  const idx = stableHash(moduleId) % ASSIGNABLE_COLORS.length;
  return ASSIGNABLE_COLORS[idx]!;
}

export type SessionCategory = 'cours' | 'evaluation' | 'evenement';

export function categoryForType(type: SessionType): SessionCategory {
  if (type === 'EXAM' || type === 'RATTRAP' || type === 'DEVOIR') return 'evaluation';
  if (type === 'EVENT') return 'evenement';
  return 'cours';
}

/**
 * Renvoie la palette à appliquer sur une séance :
 * - catégorie evaluation → palette red
 * - catégorie evenement  → palette purple
 * - sinon → palette du module
 */
export function paletteForSession(moduleId: string, type: SessionType): ModulePaletteEntry {
  const cat = categoryForType(type);
  if (cat === 'evaluation') return MODULE_PALETTES.red;
  if (cat === 'evenement') return MODULE_PALETTES.purple;
  return MODULE_PALETTES[colorForModule(moduleId)];
}
