import { Skeleton } from '@/components/ui/skeleton';

// Squelette de la vue détail séance (`/seance/:id`, acteurs consultation).
// Mime <SessionDetailView> : en-tête coloré (module + statut) puis sections
// Programmation / Lieu / Audience avec leurs lignes label/valeur.

function InfoRowSkeleton({ withIcon = true }: { withIcon?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {withIcon ? <Skeleton className="h-8 w-8 flex-shrink-0 rounded-lg" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-3.5 w-44" />
      </div>
    </div>
  );
}

function SectionSkeleton({ rows }: { rows: { withIcon: boolean }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="ml-1 h-2.5 w-24" />
      <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft bg-surface">
        {rows.map((r, i) => (
          <InfoRowSkeleton key={i} withIcon={r.withIcon} />
        ))}
      </div>
    </div>
  );
}

export function SessionDetailViewSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de la séance"
      className="flex flex-col gap-4"
    >
      {/* En-tête coloré */}
      <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-bg-warm">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-border-soft" />
        <div className="flex flex-col gap-2 px-6 py-5 pl-8">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-2 h-5 w-20 rounded-full" />
        </div>
      </div>

      <SectionSkeleton rows={[{ withIcon: true }, { withIcon: false }]} />
      <SectionSkeleton rows={[{ withIcon: true }]} />
      <SectionSkeleton rows={[{ withIcon: true }]} />
    </div>
  );
}
