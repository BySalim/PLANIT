'use client';

import { useState } from 'react';
import type { SessionDto } from '@planit/contracts';
import { CreateSessionModal } from '@/components/planning/create-session-modal';
import { PlanningGrid } from '@/components/planning/planning-grid';
import { PublishButton } from '@/components/planning/publish-button';
import { SessionDetailDrawer } from '@/components/planning/session-detail-drawer';
import { StatsBar } from '@/components/planning/stats-bar';
import { WeekNavigator } from '@/components/planning/week-navigator';
import { Button } from '@/components/ui/button';
import { useWeekSessionsQuery } from '@/lib/queries';
import { getCurrentWeekStart } from '@/lib/week';

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function RpPlanningPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getCurrentWeekStart());
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const sessionsQuery = useWeekSessionsQuery(weekStart);
  const sessions = sessionsQuery.data ?? [];

  const handleSessionClick = (session: SessionDto) => {
    setSelectedSessionId(session.id);
  };

  // V2: exporter / V2: historique / V2: vue étudiants

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Planning — RP</h1>
          <p className="text-sm text-text-sec">Vue hebdomadaire des séances du programme.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
            + Nouvelle séance
          </Button>
          <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
        </div>
      </header>

      <StatsBar weekStart={weekStart} />

      <PlanningGrid
        weekStart={weekStart}
        sessions={sessions}
        isLoading={sessionsQuery.isLoading}
        error={sessionsQuery.error}
        onSessionClick={handleSessionClick}
        onRetry={() => sessionsQuery.refetch()}
      />

      <footer className="flex items-center justify-end">
        <PublishButton sessions={sessions} />
      </footer>

      <CreateSessionModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <SessionDetailDrawer
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />
    </div>
  );
}
