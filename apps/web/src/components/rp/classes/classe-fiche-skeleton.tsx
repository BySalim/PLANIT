import { Skeleton } from '@/components/ui/skeleton';

// Squelettes de la fiche classe (`/classes/:id`) : chargement plein écran de la
// classe, puis chargement du contenu de chaque onglet (Suivi / Étudiants).
// Mime la structure réelle (en-tête chips, KPIs, onglets, tables) pour éviter
// tout saut de mise en page quand les données arrivent.

const SUIVI_COLS = 'grid grid-cols-[1.6fr_70px_70px_160px_1.2fr] items-center gap-3';
const ETU_COLS = 'grid grid-cols-[1.4fr_1fr_140px] items-center gap-3';

/** Contenu de l'onglet « Suivi pédagogique » pendant le fetch. */
export function ClasseSuiviTabSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement du suivi"
      className="overflow-hidden rounded-xl border border-border-soft bg-surface"
    >
      <div className={`${SUIVI_COLS} border-b border-border-soft bg-bg px-4 py-2.5`}>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Module
        </span>
        <span className="text-right text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Prévu
        </span>
        <span className="text-right text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Fait
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Progression
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
          Enseignant·e·s
        </span>
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`${SUIVI_COLS} px-4 py-3 last:border-b-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-soft`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Skeleton className="h-7 w-1 rounded" />
            <div className="flex min-w-0 flex-col gap-1">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <Skeleton className="ml-auto h-3.5 w-8" />
          <Skeleton className="ml-auto h-3.5 w-8" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Contenu de l'onglet « Étudiants inscrits » pendant le fetch. */
export function ClasseEtudiantsTabSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des étudiants">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`${ETU_COLS} px-4 py-3 last:border-b-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border-soft`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3.5 w-40" />
          </div>
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Chargement plein écran de la fiche (en-tête + KPIs + onglets + table). */
export function ClasseFicheSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de la classe">
      {/* En-tête : nom + chips */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-10 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>

      {/* KPIs */}
      <div className="mb-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex-1 rounded-xl border border-border-soft bg-bg-warm px-4 py-3">
            <Skeleton className="mx-auto h-6 w-12" />
            <Skeleton className="mx-auto mt-1.5 h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="mb-4 flex items-center gap-4 border-b border-border-soft pb-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-32" />
      </div>

      <ClasseSuiviTabSkeleton />
    </div>
  );
}
