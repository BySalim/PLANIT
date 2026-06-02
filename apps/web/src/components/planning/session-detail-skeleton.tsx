import { Skeleton } from '@/components/ui/skeleton';

// Squelette du contenu du drawer de détail séance, pendant le fetch
// GET /v2/sessions/:id. Mime les lignes label/valeur de <ReadOnlyView>
// (Libellé, Type, Module, Enseignant, Classes, Salle, Date, Horaire).

const ROW_COUNT = 8;

export function SessionDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de la séance"
      className="flex flex-col gap-3"
    >
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between gap-4 border-b border-border-soft pb-1.5"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ))}
    </div>
  );
}
