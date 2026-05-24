'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameDay } from 'date-fns';
import type { SessionDto } from '@planit/contracts';
import { now as nowDakar } from '@planit/utils/date';
import { Greeting } from '@/components/enseignant/greeting';
import { HeroCurrentSession } from '@/components/enseignant/hero-current-session';
import { MobileShell } from '@/components/enseignant/mobile-shell';
import { PlanningUpdateModal } from '@/components/enseignant/planning-update-modal';
import { SessionsTodayList } from '@/components/enseignant/sessions-today-list';
import { WeekStrip } from '@/components/enseignant/week-strip';
import { useCurrentTeacher } from '@/hooks/use-current-teacher';
import { useRealtimeSessions } from '@/hooks/use-realtime-sessions';
import { useWeekSessionsQuery } from '@/lib/queries';
import { getCurrentWeekStart } from '@/lib/week';

function filterTodaySessions(sessions: readonly SessionDto[], now: Date): readonly SessionDto[] {
  return sessions.filter((s) => isSameDay(new Date(s.startAt), now));
}

// eslint-disable-next-line no-restricted-syntax
export default function EnseignantHomePage() {
  const router = useRouter();
  const teacher = useCurrentTeacher();

  // Modale au lieu du toast — UX plus visible quand l'enseignant n'est pas focus.
  const [updateModal, setUpdateModal] = useState<{
    open: boolean;
    sessions: readonly SessionDto[];
  }>({ open: false, sessions: [] });

  const handlePublished = useCallback(({ sessions }: { sessions?: readonly SessionDto[] }) => {
    setUpdateModal({ open: true, sessions: sessions ?? [] });
  }, []);

  useRealtimeSessions(teacher.id, {
    onPublished: handlePublished,
    showToast: false,
  });

  const now = useMemo(() => nowDakar(), []);
  const weekStart = useMemo(() => getCurrentWeekStart(now), [now]);

  const { data, isLoading, isError } = useWeekSessionsQuery(weekStart, {
    teacherId: teacher.id,
  });

  const weekSessions = useMemo<readonly SessionDto[]>(() => data ?? [], [data]);
  const todaySessions = useMemo(() => filterTodaySessions(weekSessions, now), [weekSessions, now]);

  const handleSessionClick = (session: SessionDto) => {
    router.push(`/enseignant/seance/${session.id}`);
  };

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 px-4 py-4">
        <Greeting fullName={teacher.fullName} now={now} />

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

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <h3 className="text-[13px] font-medium text-text">Dans la semaine</h3>
                <Link
                  href="/enseignant/planning"
                  className="text-[12px] font-semibold text-accent-600 transition-colors hover:text-accent-800"
                >
                  Vue complète →
                </Link>
              </div>
              <WeekStrip
                sessions={weekSessions}
                now={now}
                onDayClick={(date) =>
                  router.push(`/enseignant/planning?date=${format(date, 'yyyy-MM-dd')}`)
                }
              />
            </div>
          </>
        )}
      </div>

      <PlanningUpdateModal
        open={updateModal.open}
        sessions={updateModal.sessions}
        onClose={() => setUpdateModal({ open: false, sessions: [] })}
      />
    </MobileShell>
  );
}
