import { differenceInMinutes, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPinIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { now as nowDakar } from '@planit/utils/date';
import { categoryForType, paletteForSession, type SessionCategory } from '@/lib/module-palette';
import { cn } from '@/lib/utils';

export interface SessionsTodayListProps {
  readonly sessions: readonly SessionDto[];
  readonly onSessionClick?: (session: SessionDto) => void;
  readonly now?: Date;
}

type SessionStatus = 'past' | 'current' | 'upcoming';

function statusFor(session: SessionDto, now: Date): SessionStatus {
  const start = new Date(session.startAt).getTime();
  const end = new Date(session.endAt).getTime();
  const ts = now.getTime();
  if (ts >= end) return 'past';
  if (ts >= start) return 'current';
  return 'upcoming';
}

function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

const CATEGORY_LABEL: Record<SessionCategory, string> = {
  cours: 'Cours',
  evaluation: 'Éval',
  evenement: 'Event',
};

const DOT_CLASS: Record<SessionStatus, string> = {
  current: 'bg-accent ring-2 ring-accent/30 animate-pulse',
  upcoming: 'bg-ok',
  past: 'bg-text-faint',
};

export function SessionsTodayList({
  sessions,
  onSessionClick,
  now = nowDakar(),
}: SessionsTodayListProps) {
  if (sessions.length === 0) {
    return (
      <section
        aria-labelledby="today-empty"
        className="rounded-xl border border-dashed border-border bg-surface px-6 py-8 text-center"
      >
        <p id="today-empty" className="text-sm text-text-sec">
          Aucune séance prévue aujourd&apos;hui.
        </p>
      </section>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <section aria-labelledby="today-title" className="flex flex-col gap-2">
      <h3
        id="today-title"
        className="flex items-center gap-2 px-1 text-[13px] font-medium text-text"
      >
        Aujourd&apos;hui
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-bg px-1.5 text-[11px] font-semibold text-text-sec">
          {sorted.length}
        </span>
      </h3>

      <ul className="flex flex-col gap-2">
        {sorted.map((session) => {
          const palette = paletteForSession(session.module.id, session.type);
          const status = statusFor(session, now);
          const start = new Date(session.startAt);
          const end = new Date(session.endAt);
          const duration = formatDuration(start, end);
          const category = categoryForType(session.type);
          const isInteractive = onSessionClick !== undefined;
          const isPast = status === 'past';

          return (
            <li key={session.id}>
              <button
                type="button"
                onClick={isInteractive ? () => onSessionClick(session) : undefined}
                disabled={!isInteractive}
                aria-label={`Séance ${session.module.name} de ${format(start, 'HH:mm', { locale: fr })} à ${format(end, 'HH:mm', { locale: fr })} (${duration})`}
                className={cn(
                  'group relative flex w-full items-stretch gap-3 overflow-hidden rounded-xl border text-left transition-shadow',
                  'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:shadow-none',
                  isPast && 'opacity-55',
                )}
                style={{
                  background: isPast ? 'var(--color-surface)' : palette.bg,
                  borderColor: isPast ? 'var(--color-border)' : palette.border,
                }}
              >
                <span
                  aria-hidden
                  className="w-1 flex-shrink-0"
                  style={{ background: palette.bar }}
                />

                <div className="flex w-12 flex-shrink-0 flex-col justify-center py-3 text-text tabular-nums">
                  <span className="text-[15px] font-semibold leading-tight">
                    {format(start, 'HH:mm', { locale: fr })}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {format(end, 'HH:mm', { locale: fr })}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold text-text-faint">{duration}</span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3">
                  <p className="truncate text-[14px] font-semibold" style={{ color: palette.text }}>
                    {session.module.name}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span
                      className="inline-flex h-[18px] items-center rounded-[5px] border px-1.5 text-[10.5px] font-semibold tracking-wide"
                      style={{
                        background: 'rgba(255,255,255,0.55)',
                        borderColor: palette.border,
                        color: palette.text,
                      }}
                    >
                      {session.classe.code}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1 text-[12px]"
                    style={{ color: palette.text, opacity: 0.75 }}
                  >
                    <MapPinIcon size={11} color="currentColor" />
                    <span className="truncate">{session.salle.name}</span>
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end justify-between py-3 pr-3">
                  <span
                    aria-hidden
                    className={cn('block size-1.5 rounded-full', DOT_CLASS[status])}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {CATEGORY_LABEL[category]}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
