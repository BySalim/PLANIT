'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameDay } from 'date-fns';
import type { SessionDto } from '@planit/contracts';
import { now as nowDakar } from '@planit/utils/date';
import { Greeting } from '@/components/enseignant/greeting';
import { HeroCurrentSession } from '@/components/enseignant/hero-current-session';
import { HeroSkeleton } from '@/components/enseignant/hero-skeleton';
import { MobileShell } from '@/components/layout/mobile-shell';
import { PlanningUpdateModal } from '@/components/enseignant/planning-update-modal';
import { SessionsTodayList } from '@/components/enseignant/sessions-today-list';
import { WeekStrip } from '@/components/enseignant/week-strip';
import { useCurrentActor } from '@/hooks/use-current-actor';
import { useRealtimeSessions } from '@/hooks/use-realtime-sessions';
import { useWeekSessionsQuery } from '@/lib/queries';
import { getCurrentWeekStart } from '@/lib/week';

function filterTodaySessions(sessions: readonly SessionDto[], now: Date): readonly SessionDto[] {
  return sessions.filter((s) => isSameDay(new Date(s.startAt), now));
}

/**
 * Vue d'accueil consultation (dashboard) rendue par le home role-aware (`/`) pour
 * les acteurs non-RP (Enseignant / Étudiant / Délégué). Fusion des anciennes
 * pages `/enseignant` et `/etudiant` : la `variant` de `useCurrentActor()` pilote
 * le filtre planning (`teacherId` vs `studentId`) et l'affichage des composants.
 */
export function ActorHomeView() {
  const router = useRouter();
  const actor = useCurrentActor();

  // Modale au lieu du toast — UX plus visible quand l'utilisateur n'est pas focus.
  const [updateModal, setUpdateModal] = useState<{
    open: boolean;
    sessions: readonly SessionDto[];
  }>({ open: false, sessions: [] });

  const handlePublished = useCallback(({ sessions }: { sessions?: readonly SessionDto[] }) => {
    setUpdateModal({ open: true, sessions: sessions ?? [] });
  }, []);

  useRealtimeSessions(true, {
    onPublished: handlePublished,
    showToast: false,
  });

  const now = useMemo(() => nowDakar(), []);
  const weekStart = useMemo(() => getCurrentWeekStart(now), [now]);

  const queryOptions = useMemo(
    () => (actor.variant === 'student' ? { studentId: actor.id } : { teacherId: actor.id }),
    [actor.variant, actor.id],
  );
  const { data, isLoading, isError } = useWeekSessionsQuery(weekStart, queryOptions);

  const weekSessions = useMemo<readonly SessionDto[]>(() => data ?? [], [data]);
  const todaySessions = useMemo(() => filterTodaySessions(weekSessions, now), [weekSessions, now]);

  const handleSessionClick = (session: SessionDto) => {
    router.push(`/seance/${session.id}`);
  };

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 px-4 py-4">
        <Greeting fullName={actor.fullName} now={now} />

        {isLoading ? (
          <HeroSkeleton />
        ) : isError ? (
          <div
            role="alert"
            className="rounded-2xl border border-err bg-err-100 px-6 py-8 text-center text-sm text-err"
          >
            Impossible de charger votre planning. Vérifiez votre connexion puis réessayez.
          </div>
        ) : (
          <>
            <HeroCurrentSession sessions={todaySessions} now={now} variant={actor.variant} />

            <SessionsTodayList
              sessions={todaySessions}
              now={now}
              variant={actor.variant}
              onSessionClick={handleSessionClick}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <h3 className="text-[13px] font-medium text-text">Dans la semaine</h3>
                <Link
                  href="/planning"
                  className="text-[12px] font-semibold text-accent-600 transition-colors hover:text-accent-800"
                >
                  Vue complète →
                </Link>
              </div>
              <WeekStrip
                sessions={weekSessions}
                now={now}
                onDayClick={(date) => router.push(`/planning?date=${format(date, 'yyyy-MM-dd')}`)}
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
