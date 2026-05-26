'use client';

import { useState } from 'react';
import type { SessionV2Dto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { CreateSessionModal } from '@/components/planning/create-session-modal';
import { HolidayBanner } from '@/components/planning/holiday-banner';
import { PlanningFooter } from '@/components/planning/stats-bar';
import { PlanningGrid } from '@/components/planning/planning-grid';
import { PlanningGridSkeleton } from '@/components/planning/planning-grid-skeleton';
import { PlanningToolbar } from '@/components/planning/planning-toolbar';
import { SessionDetailDrawer } from '@/components/planning/session-detail-drawer';
import { ViewScopeToggle, type ViewScope } from '@/components/planning/view-scope-toggle';
import type { ViewMode } from '@/components/planning/view-mode-tabs';
import { useV2WeekSessionsQuery } from '@/lib/queries-v2';
import { getCurrentWeekStart } from '@/lib/week';

// V1-D2 hardcoded demo counters (matchent les compteurs PLANIT-IA D.kpis).
// À remplacer par des hooks dédiés en Vague 02.
const DEMO_CONFLICTS = 3;
const DEMO_PENDING_DEMANDS = 5;
const DEMO_UNREAD_NOTIFS = 3;

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function RpPlanningPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getCurrentWeekStart());
  const [createOpen, setCreateOpen] = useState(false);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('classique');
  const [scope, setScope] = useState<ViewScope>('week');
  const sessionsQuery = useV2WeekSessionsQuery(weekStart);
  const sessions = sessionsQuery.data ?? [];

  // Double-clic sur une séance → ouverture du drawer de détail.
  const handleSessionOpen = (session: SessionV2Dto) => {
    setDetailSessionId(session.id);
  };

  return (
    <Shell
      fullBleed
      title="Planning hebdomadaire"
      breadcrumb={[{ label: 'Espace RP', href: '/rp' }, { label: 'Planning' }]}
      activeNavId="planning"
      conflicts={DEMO_CONFLICTS}
      pendingDemands={DEMO_PENDING_DEMANDS}
      unreadNotifs={DEMO_UNREAD_NOTIFS}
    >
      {/* Pleine page : barres figées, grille scrollable au centre (calqué PLANIT-IA/rp). */}
      <div className="flex h-full flex-col">
        {/* Toolbar : undo/redo + week nav + class selector | view modes + export + new */}
        <PlanningToolbar
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreateSession={() => setCreateOpen(true)}
        />

        {/* Holiday banner (only when the week has a holiday) */}
        <HolidayBanner weekStart={weekStart} />

        {/* Day/Week toggle + session counter */}
        <ViewScopeToggle scope={scope} onChange={setScope} sessionCount={sessions.length} />

        {/* Planning grid — fills remaining height, scrolls internally */}
        <div className="min-h-0 flex-1">
          {sessionsQuery.isLoading ? (
            <PlanningGridSkeleton />
          ) : (
            <PlanningGrid
              weekStart={weekStart}
              sessions={sessions}
              isLoading={false}
              error={sessionsQuery.error}
              onSessionOpen={handleSessionOpen}
              onRetry={() => sessionsQuery.refetch()}
            />
          )}
        </div>

        {/* Footer with stats + actions */}
        <PlanningFooter
          sessions={sessions}
          isLoading={sessionsQuery.isLoading}
          isError={sessionsQuery.isError}
        />
      </div>

      <CreateSessionModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <SessionDetailDrawer sessionId={detailSessionId} onClose={() => setDetailSessionId(null)} />
    </Shell>
  );
}
