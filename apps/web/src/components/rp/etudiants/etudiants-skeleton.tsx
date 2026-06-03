/** Skeleton table : 6 lignes en pulse pendant le fetch initial Étudiants. */
export function EtudiantsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft bg-bg">
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Étudiant
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Matricule
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Email
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, i) => (
            <tr key={i} className="border-b border-border-soft last:border-b-0">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-border-soft" aria-hidden />
                  <div className="h-3.5 w-40 animate-pulse rounded bg-border-soft" aria-hidden />
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-24 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-52 animate-pulse rounded bg-border-soft" aria-hidden />
              </td>
              <td className="px-4 py-3.5">
                <div
                  className="ml-auto h-7 w-16 animate-pulse rounded bg-border-soft"
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
