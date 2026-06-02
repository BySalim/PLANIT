import { Skeleton } from '@/components/ui/skeleton';

// Squelette de la liste Filières. Mime la grille [Sigle | Libellé | Grade |
// Actions] avec son en-tête, pour un rendu sans saut quand les données
// arrivent. La toolbar reste rendue par la page.

const ROW_COUNT = 6;

export function FilieresListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement des filières"
      className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm"
    >
      {/* En-tête colonnes (identique à la vue réelle) */}
      <div className="grid grid-cols-[80px_1fr_140px_auto] items-center border-b border-border-soft bg-bg px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Sigle
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Libellé
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Grade
        </span>
        <span className="w-[200px]" />
      </div>

      {/* Lignes skeleton */}
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[80px_1fr_140px_auto] items-center gap-3 px-5 py-3.5 last:border-b-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-soft"
        >
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-5 w-16 rounded" />
          <div className="flex items-center justify-end gap-1">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
