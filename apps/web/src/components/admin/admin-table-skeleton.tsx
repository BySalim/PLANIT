// Skeleton générique de table Admin, monté pendant `isLoading` (pattern V03).
export function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border-soft px-5 py-4 last:border-b-0"
        >
          <div className="h-4 w-1/3 animate-pulse rounded bg-bg" />
          <div className="h-4 w-1/6 animate-pulse rounded bg-bg" />
          <div className="ml-auto h-8 w-28 animate-pulse rounded bg-bg" />
        </div>
      ))}
    </div>
  );
}
