import { Skeleton } from '@/components/ui/skeleton';

// Squelettes de la page UE & Modules.
//  - <UeModulesSkeleton> : l'accordéon des UE (en-tête de ligne uniquement,
//    fermé — les modules sont lazy-loaded à l'ouverture).
//  - <ModulesListSkeleton> : les lignes de modules d'une UE déployée, pendant
//    le fetch lazy déclenché à l'ouverture.

const UE_ROW_COUNT = 5;
const MODULE_ROW_COUNT = 3;

export function UeModulesSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement des UE"
      className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm"
    >
      {Array.from({ length: UE_ROW_COUNT }, (_, i) => (
        <div key={i} className={i < UE_ROW_COUNT - 1 ? 'border-b border-border-soft' : ''}>
          <div
            className="flex items-center gap-3 px-5 py-3.5"
            style={{ borderLeft: '4px solid var(--color-border)' }}
          >
            {/* Badge code UE */}
            <Skeleton className="h-5 w-14 rounded" />
            {/* Libellé */}
            <Skeleton className="h-4 w-48 flex-1" />
            {/* Compteur modules */}
            <Skeleton className="h-3 w-16" />
            {/* Actions (éditer / supprimer / ajouter) + chevron */}
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModulesListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des modules">
      {Array.from({ length: MODULE_ROW_COUNT }, (_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-5 py-3 ${
            i < MODULE_ROW_COUNT - 1 ? 'border-b border-border-soft' : ''
          }`}
          style={{ paddingLeft: '3rem' }}
        >
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-3.5 w-40 flex-1" />
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
