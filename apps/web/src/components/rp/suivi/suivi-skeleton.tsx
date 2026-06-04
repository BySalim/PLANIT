/** Skeleton table : 6 lignes en pulse pendant le fetch initial Suivi. */
export function SuiviTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft bg-bg">
            {[
              '',
              'Module',
              'Niveau',
              'Classe',
              'Prévu',
              'Fait',
              'Progression',
              'Enseignants',
              'Action',
            ].map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, i) => (
            <tr key={i} className="border-b border-border-soft last:border-b-0">
              <td className="px-4 py-3.5">
                <div className="h-4 w-4 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-36 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-5 w-9 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-16 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-10 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-10 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-2 w-32 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2" aria-hidden>
                  <div className="h-[22px] w-[22px] animate-pulse rounded-full bg-border-soft" />
                  <div className="h-3.5 w-24 animate-pulse rounded bg-border-soft" />
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div
                  className="ml-auto h-7 w-20 animate-pulse rounded bg-border-soft"
                  aria-hidden
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
