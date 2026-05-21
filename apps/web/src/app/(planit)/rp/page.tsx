'use client';

import { useState } from 'react';
import type { SessionDto } from '@planit/contracts';
import { PlanningGrid } from '@/components/planning/planning-grid';
import { StatsBar } from '@/components/planning/stats-bar';
import { WeekNavigator } from '@/components/planning/week-navigator';
import { useWeekSessionsQuery } from '@/lib/queries';
import { getCurrentWeekStart } from '@/lib/week';

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function RpPlanningPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getCurrentWeekStart());
  const sessionsQuery = useWeekSessionsQuery(weekStart);

  const handleSessionClick = (_session: SessionDto) => {
    // PR3 will wire this to <SessionDetailDrawer>.
    // V2: exporter / V2: historique / V2: vue étudiants
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Planning — RP</h1>
          <p className="text-sm text-text-sec">Vue hebdomadaire des séances du programme.</p>
        </div>
        <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
      </header>

      <StatsBar weekStart={weekStart} />

      <PlanningGrid
        weekStart={weekStart}
        sessions={sessionsQuery.data ?? []}
        isLoading={sessionsQuery.isLoading}
        error={sessionsQuery.error}
        onSessionClick={handleSessionClick}
        onRetry={() => sessionsQuery.refetch()}
      />
    </div>
  );
}
