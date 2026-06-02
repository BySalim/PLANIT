import { Skeleton } from '@/components/ui/skeleton';

// Squelette de la table Enseignants. Mime exactement la structure réelle
// (en-tête + lignes : avatar, nom/email, badge statut, spécialité, whatsapp,
// actions) pour qu'aucun saut de layout ne survienne quand les données
// arrivent. La toolbar (filtre + bouton) reste rendue par la page : seul le
// contenu de la table est « flouté ».

const HEADERS = ['Enseignant', 'Statut', 'Spécialité', 'WhatsApp', 'Actions'] as const;
const ROW_COUNT = 8;

export function EnseignantsTableSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement des enseignants"
      className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft bg-bg">
            {HEADERS.map((h, i) => (
              <th
                key={h}
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted ${
                  i === 0 ? 'pl-5 text-left' : i === HEADERS.length - 1 ? 'text-right' : 'text-left'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROW_COUNT }, (_, i) => (
            <tr key={i} className="border-b border-border-soft last:border-b-0">
              {/* Enseignant : avatar + nom + email */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              </td>
              {/* Statut : badge */}
              <td className="px-4 py-3.5">
                <Skeleton className="h-5 w-20 rounded-md" />
              </td>
              {/* Spécialité */}
              <td className="px-4 py-3.5">
                <Skeleton className="h-4 w-24" />
              </td>
              {/* WhatsApp */}
              <td className="px-4 py-3.5">
                <Skeleton className="h-4 w-28" />
              </td>
              {/* Actions */}
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="ml-1 h-8 w-14 rounded-lg" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
