// "use client" — interactif : gestion de l'état de sélection côté client
'use client';

const PALETTE = [
  '#6B2D0E',
  '#2563EB',
  '#16A34A',
  '#DC2626',
  '#D97706',
  '#7C3AED',
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

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETTE.map((hex) => {
        const selected = value.toUpperCase() === hex.toUpperCase();
        return (
          <button
            key={hex}
            type="button"
            title={hex}
            aria-label={hex}
            aria-pressed={selected}
            onClick={() => onChange(hex)}
            style={{ backgroundColor: hex }}
            className="h-6 w-6 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {selected ? (
              <span
                className="block h-full w-full rounded-full ring-2 ring-white ring-offset-1"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
