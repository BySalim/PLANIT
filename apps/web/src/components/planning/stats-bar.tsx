import { useWeekStatsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

interface StatsBarProps {
  weekStart: Date;
}

export function StatsBar({ weekStart }: StatsBarProps) {
  const { data, isLoading, isError } = useWeekStatsQuery(weekStart);

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-sec">
        Statistiques indisponibles.
      </div>
    );
  }

  const total = data?.total ?? 0;
  const published = data?.published ?? 0;
  const pending = data?.pending ?? 0;
  const cm = data?.byType.CM ?? 0;
  const td = data?.byType.TD ?? 0;
  const tp = data?.byType.TP ?? 0;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm',
        isLoading && 'opacity-60',
      )}
    >
      <Stat label="Total" value={total} accent="text-text" />
      <Stat label="Publiées" value={published} accent="text-ok" />
      <Stat label="En attente" value={pending} accent="text-warn-text" />
      <div className="ml-auto flex items-center gap-3 text-xs text-text-muted">
        <TypePill type="CM" count={cm} />
        <TypePill type="TD" count={td} />
        <TypePill type="TP" count={tp} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn('text-xl font-bold leading-none', accent)}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
    </div>
  );
}

function TypePill({ type, count }: { type: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bg-warm px-2 py-1">
      <span className="font-semibold text-text">{type}</span>
      <span className="text-text-sec">{count}</span>
    </span>
  );
}
