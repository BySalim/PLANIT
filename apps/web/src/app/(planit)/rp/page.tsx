'use client';

import { useState } from 'react';
import { PlusIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { CreateSessionModal } from '@/components/planning/create-session-modal';
import { HolidayBanner } from '@/components/planning/holiday-banner';
import { PlanningFooter } from '@/components/planning/stats-bar';
import { PlanningGrid } from '@/components/planning/planning-grid';
import { SessionDetailDrawer } from '@/components/planning/session-detail-drawer';
import { ViewModeTabs, type ViewMode } from '@/components/planning/view-mode-tabs';
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
  const [viewMode, setViewMode] = useState<ViewMode>('classique');
  const sessionsQuery = useWeekSessionsQuery(weekStart);
  const sessions = sessionsQuery.data ?? [];

  const handleSessionClick = (session: SessionDto) => {
    setSelectedSessionId(session.id);
  };

  // V2: undo/redo · exporter · historique · vue étudiants · sélecteur classe

  return (
    <Shell
      title="Planning hebdomadaire"
      subtitle="Vue hebdomadaire des séances du programme."
      breadcrumb={[{ label: 'Espace RP', href: '/rp' }, { label: 'Planning' }]}
      activeNavId="planning"
    >
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeTabs active={viewMode} onChange={setViewMode} />
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <PlusIcon size={14} color="currentColor" />
              Nouvelle séance
            </Button>
          </div>
        </div>

        {/* Holiday banner (only when the week has a holiday) */}
        <HolidayBanner weekStart={weekStart} />

        {/* Planning grid */}
        <PlanningGrid
          weekStart={weekStart}
          sessions={sessions}
          isLoading={sessionsQuery.isLoading}
          error={sessionsQuery.error}
          onSessionClick={handleSessionClick}
          onRetry={() => sessionsQuery.refetch()}
        />

        {/* Footer with stats + actions */}
        <PlanningFooter weekStart={weekStart} sessions={sessions} />
      </div>

      <CreateSessionModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <SessionDetailDrawer
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />
    </Shell>
  );
}
