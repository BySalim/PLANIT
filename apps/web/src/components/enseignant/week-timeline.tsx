'use client';

import { addDays, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SessionDto } from '@planit/contracts';
import { paletteForSession } from '@/lib/module-palette';
import { cn } from '@/lib/utils';

const HOUR_H = 54;
const START_H = 8;
const END_H = 21;
const TOTAL_H = END_H - START_H;
const TIME_COL_W = 32;
const COL_W = 140;

function timeToY(date: Date): number {
  const h = date.getHours();
  const m = date.getMinutes();
  return (h - START_H + m / 60) * HOUR_H;
}

const DAY_INITIALS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface CompactBlockProps {
  readonly session: SessionDto;
  readonly top: number;
  readonly height: number;
  readonly onTap?: (session: SessionDto) => void;
}

function CompactBlock({ session, top, height, onTap }: CompactBlockProps) {
  const palette = paletteForSession(session.module.id, session.type);
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  return (
    <button
      type="button"
      onClick={onTap ? () => onTap(session) : undefined}
      className="absolute left-[3px] right-[3px] flex flex-col overflow-hidden rounded-lg px-1.5 pb-1 pt-1 text-left shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        top,
        height,
        background: palette.bg,
        borderLeft: `3px solid ${palette.bar}`,
      }}
      aria-label={`${session.module.name} ${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`}
    >
      <span
        className="truncate text-[10.5px] font-semibold leading-tight"
        style={{ color: palette.text }}
      >
        {session.module.name}
      </span>
      {height > 36 ? (
        <span
          className="mt-0.5 truncate text-[9.5px] font-semibold opacity-80"
          style={{ color: palette.text }}
        >
          {session.classe.code}
        </span>
      ) : null}
      {height > 48 ? (
        <span
          className="mt-0.5 text-[9.5px] font-medium tabular-nums opacity-85"
          style={{ color: palette.text }}
        >
          {format(start, 'HH:mm', { locale: fr })}
        </span>
      ) : null}
    </button>
  );
}

export interface WeekTimelineProps {
  readonly weekStart: Date;
  readonly selectedDate: Date;
  readonly sessions: readonly SessionDto[];
  readonly now?: Date;
  readonly onSessionTap?: (session: SessionDto) => void;
  readonly onDaySelect?: (date: Date) => void;
}

/**
 * Timeline Semaine — calqué proto WeekTimelineView.
 * - Header sticky avec 7 jours cliquables (jour actif marron, today accent)
 * - 7 colonnes scrollables horizontalement (touch swipe)
 * - Sessions positionnées en absolute par colonne
 */
export function WeekTimeline({
  weekStart,
  selectedDate,
  sessions,
  now = new Date(),
  onSessionTap,
  onDaySelect,
}: WeekTimelineProps) {
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const totalHeight = TOTAL_H * HOUR_H;
  const labelHours = Array.from(
    { length: Math.ceil(TOTAL_H / 2) + 1 },
    (_, i) => START_H + i * 2,
  ).filter((h) => h < END_H);
  const hasToday = weekDates.some((d) => isSameDay(d, now));
  const nowY = timeToY(now);

  return (
    <div className="flex flex-col">
      {/* Header jours (sticky top à l'intérieur du scroll vertical) */}
      <div className="sticky top-[112px] z-10 flex border-b border-border-soft bg-surface">
        <div className="flex-shrink-0" style={{ width: TIME_COL_W }} />
        <div className="flex-1 overflow-x-auto">
          <div className="flex" style={{ width: 7 * COL_W }}>
            {weekDates.map((d, i) => {
              const isToday = isSameDay(d, now);
              const isSel = isSameDay(d, selectedDate);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={onDaySelect ? () => onDaySelect(d) : undefined}
                  className="flex flex-col items-center justify-center py-1.5"
                  style={{ width: COL_W }}
                  aria-label={format(d, 'EEEE d MMMM', { locale: fr })}
                  aria-pressed={isSel}
                >
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wide',
                      isToday ? 'text-accent' : 'text-text-muted',
                    )}
                  >
                    {DAY_INITIALS[i]}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 flex size-[22px] items-center justify-center rounded-full font-display text-[11px] font-bold leading-none',
                      isSel
                        ? isToday
                          ? 'bg-accent text-white'
                          : 'bg-primary text-white'
                        : isToday
                          ? 'border-[1.5px] border-accent text-accent'
                          : 'text-text',
                    )}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grille timeline scrollable */}
      <div className="flex">
        {/* Col heures fixe gauche */}
        <div
          className="relative flex-shrink-0 bg-surface"
          style={{ width: TIME_COL_W, height: totalHeight }}
        >
          {labelHours.map((h) => {
            const isMajor = (h - START_H) % 4 === 0;
            return (
              <span
                key={h}
                className={cn(
                  'absolute right-1 pt-0.5 tabular-nums',
                  isMajor ? 'text-[9px] text-text-muted' : 'text-[8px] text-text-faint',
                )}
                style={{ top: (h - START_H) * HOUR_H }}
              >
                {h}h
              </span>
            );
          })}
          {hasToday ? (
            <span
              className="absolute right-0.5 flex h-4 items-center rounded bg-accent px-1 text-[8.5px] font-bold tabular-nums text-white shadow-[0_2px_5px_rgba(232,98,10,0.4)]"
              style={{ top: nowY - 8 }}
            >
              {format(now, 'HH:mm', { locale: fr })}
            </span>
          ) : null}
        </div>

        {/* 7 colonnes scroll horizontal */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex" style={{ width: 7 * COL_W }}>
            {weekDates.map((date, di) => {
              const isToday = isSameDay(date, now);
              const daySessions = sessions.filter((s) => isSameDay(new Date(s.startAt), date));
              return (
                <div
                  key={di}
                  className="relative flex-shrink-0"
                  style={{
                    width: COL_W,
                    height: totalHeight,
                    background: isToday ? 'rgba(107,45,14,0.02)' : 'transparent',
                  }}
                >
                  {/* Lignes horaires majeures */}
                  {Array.from({ length: Math.floor(TOTAL_H / 4) }, (_, i) => i + 1).map((i) => (
                    <span
                      key={`maj-${i}`}
                      aria-hidden
                      className="absolute inset-x-0 border-t border-border"
                      style={{ top: i * 4 * HOUR_H }}
                    />
                  ))}
                  {/* Lignes mineures */}
                  {Array.from({ length: Math.ceil(TOTAL_H / 4) }, (_, i) => i).map((i) => {
                    const y = (i * 4 + 2) * HOUR_H;
                    if (y >= totalHeight) return null;
                    return (
                      <span
                        key={`min-${i}`}
                        aria-hidden
                        className="absolute inset-x-0 border-t border-border-soft opacity-60"
                        style={{ top: y }}
                      />
                    );
                  })}
                  {/* Ligne now */}
                  {isToday ? (
                    <>
                      <span
                        aria-hidden
                        className="absolute inset-x-0 z-[4] h-[1.5px] bg-accent shadow-[0_0_6px_rgba(232,98,10,0.55)]"
                        style={{ top: nowY - 0.75 }}
                      />
                      <span
                        aria-hidden
                        className="absolute z-[5] size-2 rounded-full bg-accent shadow-[0_0_0_2px_var(--color-surface),0_1px_3px_rgba(232,98,10,0.5)]"
                        style={{ top: nowY - 4.5, left: -4.5 }}
                      />
                    </>
                  ) : null}
                  {/* Sessions */}
                  {daySessions.map((session) => {
                    const start = new Date(session.startAt);
                    const end = new Date(session.endAt);
                    const top = timeToY(start);
                    const height = Math.max(timeToY(end) - top - 2, 22);
                    return (
                      <CompactBlock
                        key={session.id}
                        session={session}
                        top={top + 1}
                        height={height}
                        {...(onSessionTap !== undefined ? { onTap: onSessionTap } : {})}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
