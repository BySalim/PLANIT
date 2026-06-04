import { Skeleton } from '@/components/ui/skeleton';

// Squelette de la liste Formations. Mime la grille
// [Code | Niveau | Filière | Année | Actions] + son en-tête, pour un rendu
// sans saut quand les données arrivent. La toolbar reste rendue par la page.

const COLS = 'grid grid-cols-[150px_70px_1fr_120px_auto] items-center gap-3';
const ROW_COUNT = 6;

export function FormationsTableSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement des formations"
      className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm"
    >
      {/* En-tête colonnes (identique à la vue réelle) */}
      <div className={`${COLS} border-b border-border-soft bg-bg px-5 py-2.5`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Code
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Niveau
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Filière
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Année
        </span>
        <span className="w-[290px]" />
      </div>

      {/* Lignes skeleton */}
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <div
          key={i}
          className={`${COLS} px-5 py-3.5 last:border-b-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-soft`}
        >
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-3.5 w-40" />
          </div>
          <Skeleton className="h-3.5 w-16" />
          <div className="flex items-center justify-end gap-1.5">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
