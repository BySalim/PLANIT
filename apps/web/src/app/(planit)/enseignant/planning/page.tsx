'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { PlanningGrid } from '@/components/planning/planning-grid';
import { PlanningFooter } from '@/components/planning/stats-bar';
import { WeekNavigator } from '@/components/planning/week-navigator';
import { useCurrentTeacher } from '@/hooks/use-current-teacher';
import { useRealtimeSessions } from '@/hooks/use-realtime-sessions';
import { useWeekSessionsQuery } from '@/lib/queries';
import { getCurrentWeekStart } from '@/lib/week';

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function EnseignantPlanningPage() {
  const router = useRouter();
  const teacher = useCurrentTeacher();
  useRealtimeSessions(teacher.id);

  const [weekStart, setWeekStart] = useState<Date>(() => getCurrentWeekStart());
  const sessionsQuery = useWeekSessionsQuery(weekStart, { teacherId: teacher.id });
  const sessions = sessionsQuery.data ?? [];

  const handleSessionOpen = (session: SessionDto) => {
    router.push(`/enseignant/seance/${session.id}`);
  };

  return (
    <Shell
      fullBleed
      title="Mon planning"
      subtitle={teacher.fullName}
      breadcrumb={[{ label: 'Espace Enseignant', href: '/enseignant' }, { label: 'Planning' }]}
      activeNavId="planning"
    >
      <div className="flex h-full flex-col">
        {/* Header : WeekNavigator + compteur séances */}
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-border-soft bg-surface px-6 py-3">
          <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
          <span className="text-[12px] font-medium text-text-faint">
            {sessions.length} séance{sessions.length > 1 ? 's' : ''} cette semaine
          </span>
        </div>

        {/* Planning grid — fills remaining height, scrolls internally */}
        <div className="min-h-0 flex-1">
          <PlanningGrid
            weekStart={weekStart}
            sessions={sessions}
            isLoading={sessionsQuery.isLoading}
            error={sessionsQuery.error}
            onSessionOpen={handleSessionOpen}
            onRetry={() => sessionsQuery.refetch()}
          />
        </div>

        {/* Footer with stats */}
        <PlanningFooter
          sessions={sessions}
          isLoading={sessionsQuery.isLoading}
          isError={sessionsQuery.isError}
        />
      </div>
    </Shell>
  );
}
