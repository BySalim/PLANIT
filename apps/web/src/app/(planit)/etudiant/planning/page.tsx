'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { now as nowDakar } from '@planit/utils/date';
import { CalendarPicker } from '@/components/enseignant/calendar-picker';
import { DayTimeline } from '@/components/enseignant/day-timeline';
import { MobileShell } from '@/components/etudiant/mobile-shell';
import { PlanningUpdateModal } from '@/components/enseignant/planning-update-modal';
import { WeekDayHeader, WeekTimeline } from '@/components/enseignant/week-timeline';
import { useToast } from '@/components/ui/toast-provider';
import { useCurrentStudent } from '@/hooks/use-current-student';
import { useRealtimeSessions } from '@/hooks/use-realtime-sessions';
import { useWeekSessionsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week';
type TypeFilter = 'all' | 'cours' | 'eval' | 'event';

const FILTER_LABEL: Record<TypeFilter, string> = {
  all: 'Tous',
  cours: 'Cours',
  eval: 'Éval.',
  event: 'Évén.',
};

// eslint-disable-next-line no-restricted-syntax
export default function EtudiantPlanningPage() {
  const router = useRouter();
  const student = useCurrentStudent();
  const toast = useToast();

  const [view, setView] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(() => nowDakar());
  const [showCalendar, setShowCalendar] = useState(false);
  // Filtre affiché mais inactif — TD-019.
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  // ScrollX partagé entre WeekDayHeader (sticky) et WeekTimeline (grille).
  const [weekScrollX, setWeekScrollX] = useState(0);

  const [updateModal, setUpdateModal] = useState<{
    open: boolean;
    sessions: readonly SessionDto[];
  }>({ open: false, sessions: [] });

  const handlePublished = useCallback(({ sessions }: { sessions?: readonly SessionDto[] }) => {
    setUpdateModal({ open: true, sessions: sessions ?? [] });
  }, []);

  useRealtimeSessions(student.id, {
    onPublished: handlePublished,
    showToast: false,
  });

  const now = useMemo(() => nowDakar(), []);
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

  const { data } = useWeekSessionsQuery(weekStart, { studentId: student.id });
  const sessions = useMemo<readonly SessionDto[]>(() => data ?? [], [data]);

  const dateLabel = useMemo(() => {
    if (view === 'day') {
      return format(selectedDate, 'EEE d MMM', { locale: fr });
    }
    const end = addDays(weekStart, 6);
    return `${format(weekStart, 'd', { locale: fr })}–${format(end, 'd MMM', { locale: fr })}`;
  }, [view, selectedDate, weekStart]);

  const handleSessionTap = (session: SessionDto) => {
    router.push(`/etudiant/seance/${session.id}`);
  };

  const handleDownloadClick = () => {
    toast.show('Export bientôt disponible', { variant: 'info' });
  };

  return (
    <MobileShell>
      <div className="relative flex flex-col">
        {/* Bloc sticky unique : toolbar + (en vue semaine) ligne des jours, pour rester collés. */}
        <div className="sticky top-0 z-20 bg-surface">
          <div className="flex items-center gap-2 border-b border-border-soft bg-surface px-3 py-2">
            <div className="flex rounded-[10px] border border-border-soft bg-bg p-0.5">
              {(['day', 'week'] as const).map((v) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setView(v);
                      setShowCalendar(false);
                    }}
                    className={cn(
                      'rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-all',
                      active
                        ? 'bg-primary text-white shadow-[0_2px_6px_rgba(107,45,14,0.25)]'
                        : 'text-text-muted',
                    )}
                  >
                    {v === 'day' ? 'Jour' : 'Semaine'}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowCalendar((c) => !c)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px] font-medium transition-colors',
                showCalendar
                  ? 'border-primary bg-primary-100 text-primary'
                  : 'border-border bg-surface text-text',
              )}
            >
              <CalendarIcon
                size={13}
                color={showCalendar ? 'var(--color-primary)' : 'var(--color-accent)'}
              />
              {dateLabel}
            </button>

            <div className="flex-1" />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              aria-label="Filtrer par type"
              className="cursor-pointer rounded-md border border-border bg-surface px-1.5 py-1 text-[10.5px] text-text outline-none"
              title="Filtre bientôt disponible"
            >
              {(['all', 'cours', 'eval', 'event'] as const).map((f) => (
                <option key={f} value={f}>
                  {FILTER_LABEL[f]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleDownloadClick}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-text-sec transition-colors hover:border-primary hover:text-primary"
              aria-label="Exporter mon planning"
              title="Export bientôt disponible"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>

          {view === 'week' ? (
            <WeekDayHeader
              weekStart={weekStart}
              selectedDate={selectedDate}
              now={now}
              scrollX={weekScrollX}
              onDaySelect={(d) => {
                setSelectedDate(d);
                setView('day');
              }}
            />
          ) : null}
        </div>

        <div className="relative">
          {view === 'day' ? (
            <DayTimeline
              date={selectedDate}
              sessions={sessions}
              now={now}
              onSessionTap={handleSessionTap}
            />
          ) : (
            <WeekTimeline
              weekStart={weekStart}
              sessions={sessions}
              now={now}
              variant="student"
              onSessionTap={handleSessionTap}
              onScrollXChange={setWeekScrollX}
            />
          )}

          <CalendarPicker
            open={showCalendar}
            selectedDate={selectedDate}
            today={now}
            onSelect={(d) => {
              setSelectedDate(d);
              setShowCalendar(false);
            }}
            onClose={() => setShowCalendar(false)}
          />
        </div>
      </div>

      <PlanningUpdateModal
        open={updateModal.open}
        sessions={updateModal.sessions}
        onClose={() => setUpdateModal({ open: false, sessions: [] })}
      />
    </MobileShell>
  );
}
