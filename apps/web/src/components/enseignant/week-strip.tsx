import { addDays, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SessionDto } from '@planit/contracts';
import { categoryForType } from '@/lib/module-palette';
import { cn } from '@/lib/utils';
import { getCurrentWeekStart } from '@/lib/week';

export interface WeekStripProps {
  readonly sessions: readonly SessionDto[];
  readonly now?: Date;
  readonly onDayClick?: (date: Date) => void;
}

interface DayCell {
  readonly date: Date;
  readonly initial: string;
  readonly num: number;
  readonly month: string;
  readonly count: number;
  readonly hasEvaluation: boolean;
  readonly isToday: boolean;
}

const MAX_DOTS = 5;

function buildWeekCells(
  sessions: readonly SessionDto[],
  weekStart: Date,
  today: Date,
): readonly DayCell[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(weekStart, offset);
    const daySessions = sessions.filter((s) => isSameDay(new Date(s.startAt), date));
    return {
      date,
      initial: format(date, 'EEEEEE', { locale: fr }), // 2 lettres (lu, ma, ...)
      num: date.getDate(),
      month: format(date, 'MMM', { locale: fr }), // jan, fév, mar...
      count: daySessions.length,
      hasEvaluation: daySessions.some((s) => categoryForType(s.type) === 'evaluation'),
      isToday: isSameDay(date, today),
    };
  });
}

export function WeekStrip({ sessions, now = new Date(), onDayClick }: WeekStripProps) {
  const weekStart = getCurrentWeekStart(now);
  const days = buildWeekCells(sessions, weekStart, now);

  return (
    <section aria-labelledby="week-strip-title" className="flex flex-col gap-2">
      <h3
        id="week-strip-title"
        className="px-1 text-[10.5px] font-bold uppercase tracking-wider text-text-faint"
      >
        Dans la semaine
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const active = d.isToday;
          const interactive = onDayClick !== undefined;
          const Cell = interactive ? 'button' : 'div';
          return (
            <Cell
              key={d.date.toISOString()}
              type={interactive ? 'button' : undefined}
              onClick={interactive ? () => onDayClick(d.date) : undefined}
              aria-label={`${format(d.date, 'EEEE d MMMM', { locale: fr })} · ${d.count} séance${d.count > 1 ? 's' : ''}${d.hasEvaluation ? ' (évaluation)' : ''}`}
              className={cn(
                'flex flex-shrink-0 flex-col items-center justify-start rounded-2xl border pt-2 transition-shadow',
                active
                  ? 'h-[100px] w-[72px] border-primary bg-primary text-white shadow-[0_6px_16px_-4px_rgba(107,45,14,0.4)]'
                  : 'h-[92px] w-[60px] border-border bg-surface text-text hover:shadow-md',
                interactive &&
                  !active &&
                  'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                interactive && active && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'text-[9px] font-semibold uppercase tracking-wider',
                  active ? 'text-white/70' : 'text-text-muted',
                )}
              >
                {d.initial}
              </span>
              <span
                className={cn(
                  'mt-0.5 font-display font-semibold leading-none tabular-nums',
                  active ? 'text-[24px]' : 'text-[21px]',
                )}
              >
                {d.num}
              </span>
              {active ? (
                <span className="mt-1 rounded-[4px] bg-accent px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider leading-[1.4] text-white">
                  Auj
                </span>
              ) : (
                <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-text-faint">
                  {d.month}
                </span>
              )}

              <div className="mb-2 mt-auto flex h-[5px] items-center gap-[2.5px]">
                {d.count === 0 ? (
                  <span
                    className={cn('size-1 rounded-full', active ? 'bg-white/35' : 'bg-border-soft')}
                  />
                ) : (
                  Array.from({ length: Math.min(d.count, MAX_DOTS) }).map((_, k) => (
                    <span
                      key={k}
                      className={cn(
                        'size-1 rounded-full',
                        d.hasEvaluation && k === 0 ? 'bg-err' : active ? 'bg-white' : 'bg-accent',
                      )}
                    />
                  ))
                )}
              </div>
            </Cell>
          );
        })}
      </div>
    </section>
  );
}
