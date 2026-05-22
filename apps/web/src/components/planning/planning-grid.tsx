import { addDays, differenceInMinutes, format, getHours, getMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SessionDto } from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SessionCard } from './session-card';

interface PlanningGridProps {
  weekStart: Date;
  sessions: SessionDto[];
  isLoading: boolean;
  error: Error | null;
  onSessionClick?: ((session: SessionDto) => void) | undefined;
  onRetry?: (() => void) | undefined;
}

const DAY_START = 8;
const DAY_END = 20;
const HOUR_HEIGHT = 64;
const DAY_COUNT = 6; // Lundi → Samedi
const GRID_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT;
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

interface PositionedSession {
  session: SessionDto;
  dayIndex: number;
  top: number;
  height: number;
}

function positionSession(session: SessionDto): PositionedSession | null {
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  // date-fns getDay: Sun=0, Mon=1, ..., Sat=6
  const jsDay = start.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0..Sun=6
  if (dayIndex >= DAY_COUNT) return null;

  const startHour = getHours(start) + getMinutes(start) / 60;
  const durationMinutes = differenceInMinutes(end, start);
  if (startHour < DAY_START || startHour >= DAY_END) return null;

  return {
    session,
    dayIndex,
    top: (startHour - DAY_START) * HOUR_HEIGHT,
    height: Math.max(28, (durationMinutes / 60) * HOUR_HEIGHT - 4),
  };
}

export function PlanningGrid({
  weekStart,
  sessions,
  isLoading,
  error,
  onSessionClick,
  onRetry,
}: PlanningGridProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-err bg-err-100 px-6 py-10 text-center">
        <p className="font-medium text-err">Impossible de charger le planning.</p>
        <p className="text-sm text-text-sec">{error.message}</p>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Réessayer
          </Button>
        ) : null}
      </div>
    );
  }

  const positioned = isLoading
    ? []
    : sessions.map((s) => positionSession(s)).filter((p): p is PositionedSession => p !== null);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <div className="grid min-w-[720px] grid-cols-[64px_repeat(6,minmax(0,1fr))]">
        {/* Header row : empty cell + day labels */}
        <div className="border-b border-r border-border bg-bg-warm" />
        {Array.from({ length: DAY_COUNT }, (_, dayIndex) => {
          const dayDate = addDays(weekStart, dayIndex);
          return (
            <div
              key={dayIndex}
              className="border-b border-r border-border bg-bg-warm px-3 py-2 text-center"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-text-sec">
                {format(dayDate, 'EEEE', { locale: fr })}
              </div>
              <div className="text-xs text-text-muted">
                {format(dayDate, 'd MMM', { locale: fr })}
              </div>
            </div>
          );
        })}

        {/* Body : hour column + day columns with absolute-positioned sessions */}
        <div className="relative border-r border-border bg-bg-warm" style={{ height: GRID_HEIGHT }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-1 -translate-y-1/2 text-[10px] font-medium text-text-muted"
              style={{ top: (hour - DAY_START) * HOUR_HEIGHT }}
            >
              {hour}h
            </div>
          ))}
        </div>

        {Array.from({ length: DAY_COUNT }, (_, dayIndex) => (
          <div
            key={dayIndex}
            className="relative border-r border-border"
            style={{ height: GRID_HEIGHT }}
          >
            {HOURS.slice(0, -1).map((hour) => (
              <div
                key={hour}
                className={cn(
                  'absolute inset-x-0 h-px',
                  hour % 2 === 0 ? 'bg-border' : 'bg-border-soft',
                )}
                style={{ top: (hour - DAY_START) * HOUR_HEIGHT }}
                aria-hidden
              />
            ))}

            {isLoading ? (
              <SkeletonColumn dayIndex={dayIndex} />
            ) : (
              positioned
                .filter((p) => p.dayIndex === dayIndex)
                .map((p) => (
                  <div
                    key={p.session.id}
                    className="absolute inset-x-1"
                    style={{ top: p.top, height: p.height }}
                  >
                    <SessionCard session={p.session} onClick={onSessionClick} />
                  </div>
                ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonColumn({ dayIndex }: { dayIndex: number }) {
  // Show a couple of skeleton blocks per column on alternating offsets.
  const offsets = dayIndex % 2 === 0 ? [1, 5] : [3];
  return (
    <>
      {offsets.map((hourOffset) => (
        <div
          key={hourOffset}
          className="absolute inset-x-1 animate-pulse rounded-md bg-border-soft"
          style={{ top: hourOffset * HOUR_HEIGHT, height: HOUR_HEIGHT * 1.5 }}
          aria-hidden
        />
      ))}
    </>
  );
}
