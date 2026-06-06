import { Skeleton } from '@/components/ui/skeleton';

// Squelette de la liste Classes. Mime la grille
// [Classe | Double diplôme | Année | Places | Actions] + son en-tête, pour un
// rendu sans saut quand les données arrivent. La toolbar reste rendue par la page.

const COLS = 'grid grid-cols-[1.7fr_120px_110px_190px_auto] items-center gap-3';
const ROW_COUNT = 6;

export function ClassesTableSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement des classes"
      className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm"
    >
      {/* En-tête colonnes (identique à la vue réelle) */}
      <div className={`${COLS} border-b border-border-soft bg-bg px-5 py-2.5`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Classe
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Double diplôme
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Année
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Places
        </span>
        <span className="w-[90px]" />
      </div>

      {/* Lignes skeleton */}
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <div
          key={i}
          className={`${COLS} px-5 py-3.5 last:border-b-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-soft`}
        >
          {/* Classe : badges + nom + code */}
          <div className="flex min-w-0 items-center gap-2.5">
            <Skeleton className="h-5 w-8 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
            <div className="flex min-w-0 flex-col gap-1">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          {/* Double diplôme */}
          <Skeleton className="h-5 w-24 rounded-full" />
          {/* Année */}
          <Skeleton className="h-3.5 w-16" />
          {/* Places */}
          <Skeleton className="h-1.5 w-full rounded-full" />
          {/* Actions */}
          <div className="flex items-center justify-end gap-1.5">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
