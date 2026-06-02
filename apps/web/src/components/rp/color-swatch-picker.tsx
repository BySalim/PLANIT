// "use client" — interactif : gestion de l'état de sélection côté client
'use client';

import { CheckIcon } from '@planit/ui';
import { cn } from '@/lib/utils';

// Palette utilisateur pour UE / Module.
// Le rouge (#DC2626) et le violet (#7C3AED) sont **réservés** par le
// design system (alertes, sélection drag, etc.) — on ne les expose pas
// au choix utilisateur pour éviter qu'une UE rouge ne soit confondue
// avec un état d'erreur dans la grille planning.
const PALETTE = [
  '#6B2D0E',
  '#2563EB',
  '#16A34A',
  '#D97706',
  '#0891B2',
  '#DB2777',
  '#65A30D',
  '#78716C',
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export type ColorSwatchPickerProps = {
  value: string;
  onChange: (hex: string) => void;
};

/**
 * Picker de couleur à pastilles.
 *  - pastille 32 px pour un clic facile (Fitt's law) ;
 *  - check blanc centré sur la pastille sélectionnée ;
 *  - ring offset autour de la pastille sélectionnée — signal visuel net.
 */
export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  const normalizedValue = value.toUpperCase();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PALETTE.map((hex) => {
        const selected = normalizedValue === hex.toUpperCase();
        return (
          <button
            key={hex}
            type="button"
            title={hex}
            aria-label={`Couleur ${hex}`}
            aria-pressed={selected}
            onClick={() => onChange(hex)}
            style={{ backgroundColor: hex }}
            className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-full transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              selected
                ? 'scale-110 shadow-md ring-2 ring-text ring-offset-2 ring-offset-surface'
                : 'opacity-90 hover:scale-110 hover:opacity-100',
            )}
          >
            {selected ? <CheckIcon size={14} color="white" /> : null}
          </button>
        );
      })}
    </div>
  );
}
