'use client';

import type { SessionDto } from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { useWeekStatsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { PublishButton } from './publish-button';

interface PlanningFooterProps {
  weekStart: Date;
  sessions: SessionDto[];
}

export function PlanningFooter({ weekStart, sessions }: PlanningFooterProps) {
  const { data, isLoading, isError } = useWeekStatsQuery(weekStart);

  const total = data?.total ?? 0;
  const published = data?.published ?? 0;
  const pending = data?.pending ?? 0;

  return (
    <footer
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3',
        isLoading && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-text-sec">
        {isError ? (
          <span className="text-text-muted">
            Backend indisponible. Démarre Docker puis recharge.
          </span>
        ) : (
          <>
            <span>
              <strong className="font-semibold text-text">{total}</strong> séances
            </span>
            <span className="text-text-faint">·</span>
            <span>
              <strong className="font-semibold text-ok">{published}</strong> publiées
            </span>
            <span className="text-text-faint">·</span>
            <span>
              <strong className="font-semibold text-warn-text">{pending}</strong> provisoires
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-[11.5px] text-text-muted md:inline">
          Auto-publication vendredi 22:00
        </span>
        {/* V2: Historique / Exporter / Aperçu étudiant — visibles mais disabled */}
        <Button variant="ghost" size="sm" disabled title="Disponible Vague 02">
          Historique
        </Button>
        <Button variant="ghost" size="sm" disabled title="Disponible Vague 02">
          Exporter
        </Button>
        <Button variant="ghost" size="sm" disabled title="Disponible Vague 02">
          Aperçu étudiant
        </Button>
        <PublishButton sessions={sessions} />
      </div>
    </footer>
  );
}
