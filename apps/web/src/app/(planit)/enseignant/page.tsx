'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionDto } from '@planit/contracts';
import { Shell } from '@/components/layout/shell';
import { HeroCurrentSession } from '@/components/enseignant/hero-current-session';
import { SessionsTodayList } from '@/components/enseignant/sessions-today-list';
import { useCurrentTeacher } from '@/hooks/use-current-teacher';
import { useRealtimeSessions } from '@/hooks/use-realtime-sessions';
import { useWeekSessionsQuery } from '@/lib/queries';
import { getCurrentWeekStart } from '@/lib/week';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function filterTodaySessions(sessions: readonly SessionDto[], now: Date): readonly SessionDto[] {
  return sessions.filter((s) => isSameDay(new Date(s.startAt), now));
}

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function EnseignantHomePage() {
  const router = useRouter();
  const teacher = useCurrentTeacher();
  useRealtimeSessions(teacher.id);

  const now = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => getCurrentWeekStart(now), [now]);

  const { data, isLoading, isError } = useWeekSessionsQuery(weekStart, {
    teacherId: teacher.id,
  });

  const todaySessions = useMemo(() => filterTodaySessions(data ?? [], now), [data, now]);

  const handleSessionClick = (session: SessionDto) => {
    router.push(`/enseignant/seance/${session.id}`);
  };

  return (
    <Shell
      title="Espace Enseignant"
      subtitle={teacher.fullName}
      breadcrumb={[{ label: 'Espace Enseignant' }]}
      activeNavId="home"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-8 text-center text-sm text-text-sec">
            Chargement de votre planning…
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="rounded-2xl border border-err bg-err-100 px-6 py-8 text-center text-sm text-err"
          >
            Impossible de charger votre planning. Vérifiez votre connexion puis réessayez.
          </div>
        ) : (
          <>
            <HeroCurrentSession sessions={todaySessions} now={now} />
            <SessionsTodayList
              sessions={todaySessions}
              now={now}
              onSessionClick={handleSessionClick}
            />
          </>
        )}
      </div>
    </Shell>
  );
}
