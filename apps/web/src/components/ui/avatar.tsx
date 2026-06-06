import { cn } from '@/lib/utils';

// ── Avatar à initiales — mutualisé (clôt TD-V03-AVATAR-EXTRACT) ──────────
// Couleur dérivée déterministiquement du nom (hash → palette stable). Purement
// décoratif (aria-hidden) : le nom complet est toujours rendu à côté.

const AVATAR_PALETTES = [
  { bg: 'rgba(107,45,14,0.13)', fg: '#6B2D0E' },
  { bg: 'rgba(232,98,10,0.13)', fg: '#C44E07' },
  { bg: 'rgba(22,163,74,0.13)', fg: '#15803D' },
  { bg: 'rgba(37,99,235,0.13)', fg: '#1D4ED8' },
  { bg: 'rgba(124,58,237,0.13)', fg: '#6D28D9' },
  { bg: 'rgba(8,145,178,0.13)', fg: '#0E7490' },
] as const;

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function getAvatarPalette(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]!;
}

interface AvatarProps {
  readonly name: string;
  /** Diamètre en px (défaut 36). La police suit proportionnellement. */
  readonly size?: number;
  readonly className?: string;
}

/** Pastille ronde à initiales, taille paramétrable. */
export function Avatar({ name, size = 36, className }: AvatarProps) {
  const palette = getAvatarPalette(name);
  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center rounded-full font-bold leading-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.33)),
        background: palette.bg,
        color: palette.fg,
      }}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}
