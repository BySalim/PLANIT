import { cn } from '@/lib/utils';

interface SkeletonProps {
  /** Dimensions, arrondi, marges via classes Tailwind (ex. "h-4 w-32 rounded-full"). */
  readonly className?: string;
}

/**
 * Brique de base des écrans de chargement « skeleton ».
 *
 * Rend un bloc neutre (bg-border-soft) balayé par un reflet shimmer animé
 * (cf. utilitaire `.skeleton` dans globals.css — figé sous
 * `prefers-reduced-motion`). On compose plusieurs `<Skeleton>` pour reproduire
 * la *structure* réelle d'une page (lignes de table, cartes, accordéon) afin
 * que le chrome s'affiche immédiatement et que seules les données soient
 * « floutées » le temps du fetch.
 *
 * Accessibilité : le bloc est `aria-hidden`. C'est le conteneur skeleton
 * parent qui porte `role="status"` + `aria-busy="true"` + un libellé
 * « Chargement … » (un seul message pour le lecteur d'écran, pas N blocs).
 *
 * @example
 * <Skeleton className="h-9 w-9 rounded-full" />   // avatar
 * <Skeleton className="h-4 w-40" />               // ligne de texte
 */
export function Skeleton({ className }: SkeletonProps) {
  return <span aria-hidden className={cn('skeleton block rounded-md', className)} />;
}
