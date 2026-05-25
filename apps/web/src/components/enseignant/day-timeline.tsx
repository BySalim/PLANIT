'use client';

import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPinIcon, UserSmallIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { now as nowDakar } from '@planit/utils/date';
import { paletteForSession, categoryForType } from '@/lib/module-palette';
import { cn } from '@/lib/utils';

const HOUR_H = 60;
const START_H = 8;
const END_H = 21;
const TOTAL_H = END_H - START_H; // 13 heures
const TIME_COL_W = 40;

/** "2h" / "1h30" / "30min" — calque proto. */
function formatDuration(start: Date, end: Date): string {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function timeToY(date: Date): number {
  const h = date.getHours();
  const m = date.getMinutes();
  return (h - START_H + m / 60) * HOUR_H;
}

const CATEGORY_LABEL = {
  cours: 'Cours',
  evaluation: 'Éval',
  evenement: 'Évén',
} as const;

interface SessionBlockProps {
  readonly session: SessionDto;
  readonly top: number;
  readonly height: number;
  readonly status: 'past' | 'ongoing' | 'upcoming';
  readonly variant: 'teacher' | 'student';
  readonly onTap?: (session: SessionDto) => void;
}

function SessionBlock({ session, top, height, status, variant, onTap }: SessionBlockProps) {
  const palette = paletteForSession(session.module.id, session.type);
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const duration = formatDuration(start, end);
  const category = categoryForType(session.type);

  const isOngoing = status === 'ongoing';
  const isPast = status === 'past';
  const statusDot = isOngoing
    ? 'bg-accent animate-pulse ring-2 ring-accent/30'
    : isPast
      ? 'bg-text-faint'
      : 'bg-ok';

  const showTime = height > 62;
  const showLoc = height > 78;

  return (
    <button
      type="button"
      onClick={onTap ? () => onTap(session) : undefined}
      className="absolute left-1 right-1 flex gap-2 overflow-hidden rounded-xl px-2.5 pb-1.5 pt-1.5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        top,
        height,
        background: palette.bg,
        borderLeft: `4px solid ${palette.bar}`,
      }}
      aria-label={`Séance ${session.module.name} de ${format(start, 'HH:mm')} à ${format(end, 'HH:mm')}`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="truncate text-[13.5px] font-semibold leading-tight"
          style={{ color: palette.text }}
        >
          {session.module.name}
        </span>
        {variant === 'teacher' ? (
          <span
            className="mt-0.5 inline-flex max-w-fit items-center rounded-[4px] border px-1.5 text-[10.5px] font-semibold leading-[1.4]"
            style={{
              background: 'rgba(255,255,255,0.55)',
              borderColor: palette.border,
              color: palette.text,
            }}
          >
            {session.classe.code}
          </span>
        ) : null}
        {showTime ? (
          <span
            className="mt-1 text-[11.5px] font-medium tabular-nums"
            style={{ color: palette.text, opacity: 0.85 }}
          >
            {format(start, 'HH:mm', { locale: fr })} – {format(end, 'HH:mm', { locale: fr })}{' '}
            <span className="opacity-60">·</span> <span className="font-semibold">{duration}</span>
          </span>
        ) : null}
        {variant === 'student' ? (
          // Étudiant : prof juste après l'heure (design ref)
          <span
            className="mt-1 flex items-center gap-1 truncate text-[11.5px]"
            style={{ color: palette.text, opacity: 0.78 }}
          >
            <UserSmallIcon size={12} color="currentColor" />
            <span className="truncate">{session.teacher.fullName}</span>
          </span>
        ) : null}
        {showLoc ? (
          <span
            className="mt-1 flex items-center gap-1 truncate text-[11.5px]"
            style={{ color: palette.text, opacity: 0.72 }}
          >
            <MapPinIcon size={12} color="currentColor" />
            {session.salle.name}
          </span>
        ) : null}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end justify-between py-0.5">
        <span aria-hidden className={cn('block size-1.5 rounded-full', statusDot)} />
        <span className="text-[9.5px] font-bold uppercase tracking-wider text-text-muted">
          {CATEGORY_LABEL[category]}
        </span>
      </div>
    </button>
  );
}

export interface DayTimelineProps {
  readonly date: Date;
  readonly sessions: readonly SessionDto[];
  readonly now?: Date;
  /** 'teacher' (défaut) : affiche le code classe · 'student' : affiche le prof. */
  readonly variant?: 'teacher' | 'student';
  readonly onSessionTap?: (session: SessionDto) => void;
}

export function DayTimeline({
  date,
  sessions,
  now = nowDakar(),
  variant = 'teacher',
  onSessionTap,
}: DayTimelineProps) {
  const isToday = isSameDay(date, now);
  const nowY = timeToY(now);
  const totalHeight = TOTAL_H * HOUR_H;

  const labelHours = Array.from(
    { length: Math.ceil(TOTAL_H / 2) + 1 },
    (_, i) => START_H + i * 2,
  ).filter((h) => h < END_H);

  const daySessions = sessions.filter((s) => isSameDay(new Date(s.startAt), date));

  function statusFor(session: SessionDto): 'past' | 'ongoing' | 'upcoming' {
    const s = new Date(session.startAt).getTime();
    const e = new Date(session.endAt).getTime();
    if (!isToday) {
      return date.getTime() < now.getTime() ? 'past' : 'upcoming';
    }
    const ts = now.getTime();
    if (ts >= e) return 'past';
    if (ts >= s) return 'ongoing';
    return 'upcoming';
  }

  return (
    <div className="flex bg-bg">
      <div
        className="relative flex-shrink-0 bg-bg"
        style={{ width: TIME_COL_W, height: totalHeight }}
      >
        {labelHours.map((h) => {
          const isMajor = (h - START_H) % 4 === 0;
          return (
            <span
              key={h}
              className={cn(
                'absolute right-1.5 pt-0.5 font-medium tabular-nums',
                isMajor ? 'text-[10px] text-text-muted' : 'text-[9px] text-text-faint',
              )}
              style={{ top: (h - START_H) * HOUR_H }}
            >
              {h}h
            </span>
          );
        })}
        {isToday ? (
          <span
            className="absolute right-0.5 flex h-[18px] items-center rounded-[5px] bg-accent px-1.5 text-[9.5px] font-bold tabular-nums text-white shadow-[0_2px_6px_rgba(232,98,10,0.4)]"
            style={{ top: nowY - 9 }}
          >
            {format(now, 'HH:mm', { locale: fr })}
          </span>
        ) : null}
      </div>

      <div className="relative flex-1 border-l border-border-soft" style={{ height: totalHeight }}>
        {Array.from({ length: Math.floor(TOTAL_H / 4) }, (_, i) => i + 1).map((i) => (
          <span
            key={`maj-${i}`}
            aria-hidden
            className="absolute inset-x-0 border-t border-border"
            style={{ top: i * 4 * HOUR_H }}
          />
        ))}
        {Array.from({ length: Math.ceil(TOTAL_H / 4) }, (_, i) => i).map((i) => {
          const y = (i * 4 + 2) * HOUR_H;
          if (y >= totalHeight) return null;
          return (
            <span
              key={`min-${i}`}
              aria-hidden
              className="absolute inset-x-0 border-t border-border-soft opacity-70"
              style={{ top: y }}
            />
          );
        })}
        {isToday ? (
          <>
            <span
              aria-hidden
              className="absolute inset-x-0 z-[4] h-[1.5px] bg-accent shadow-[0_0_8px_rgba(232,98,10,0.55)]"
              style={{ top: nowY - 0.75 }}
            />
            <span
              aria-hidden
              className="absolute z-[5] size-2.5 rounded-full bg-accent shadow-[0_0_0_2px_var(--color-bg),0_1px_4px_rgba(232,98,10,0.5)]"
              style={{ top: nowY - 5, left: -5 }}
            />
          </>
        ) : null}
        {daySessions.map((session) => {
          const start = new Date(session.startAt);
          const end = new Date(session.endAt);
          const top = timeToY(start);
          const height = Math.max(timeToY(end) - top - 2, 28);
          return (
            <SessionBlock
              key={session.id}
              session={session}
              top={top + 1}
              height={height}
              status={statusFor(session)}
              variant={variant}
              {...(onSessionTap !== undefined ? { onTap: onSessionTap } : {})}
            />
          );
        })}
      </div>
    </div>
  );
}
