// Skeleton table Personnel — monté pendant isLoading (V05 LOT 3).
// Pas d'état interactif : Server Component serait possible mais encapsulé
// dans un parent 'use client', donc pas de directive nécessaire ici.

export function PersonnelSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b border-border-soft px-5 py-3">
        <span className="h-4 w-28 animate-pulse rounded bg-border-soft" aria-hidden />
        <span className="h-8 w-32 animate-pulse rounded-lg bg-border-soft" aria-hidden />
      </div>
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-border-soft bg-bg px-5 py-2.5">
        {(['Nom', 'Rôle', 'Statut', 'Matricule', 'Actions'] as const).map((col) => (
          <span
            key={col}
            className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"
          >
            {col}
          </span>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-border-soft px-5 py-3.5 last:border-0"
        >
          <span className="h-3.5 w-40 animate-pulse rounded bg-border-soft" aria-hidden />
          <span className="h-5 w-16 animate-pulse rounded-full bg-border-soft" aria-hidden />
          <span className="h-5 w-16 animate-pulse rounded-full bg-border-soft" aria-hidden />
          <span className="h-3.5 w-24 animate-pulse rounded bg-border-soft" aria-hidden />
          <span className="h-7 w-20 animate-pulse rounded-lg bg-border-soft" aria-hidden />
        </div>
      ))}
    </div>
  );
}
