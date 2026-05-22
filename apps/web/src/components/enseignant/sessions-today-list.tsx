import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPinIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { paletteForSession } from '@/lib/module-palette';

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

const STATUS_LABEL: Record<SessionStatus, string> = {
  past: 'Terminée',
  current: 'En cours',
  upcoming: 'À venir',
};

const STATUS_CLASSES: Record<SessionStatus, string> = {
  past: 'bg-bg text-text-faint border-border',
  current: 'bg-accent-100 text-accent-800 border-accent-600',
  upcoming: 'bg-ok-100 text-ok border-ok',
};

export function SessionsTodayList({
  sessions,
  onSessionClick,
  now = new Date(),
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
        className="px-1 text-[10.5px] font-bold uppercase tracking-wider text-text-faint"
      >
        Aujourd&apos;hui · {sorted.length}
      </h3>
      <ul className="flex flex-col gap-2">
        {sorted.map((session) => {
          const palette = paletteForSession(session.module.id, session.type);
          const status = statusFor(session, now);
          const start = new Date(session.startAt);
          const end = new Date(session.endAt);
          const isInteractive = onSessionClick !== undefined;

          return (
            <li key={session.id}>
              <button
                type="button"
                onClick={isInteractive ? () => onSessionClick(session) : undefined}
                disabled={!isInteractive}
                aria-label={`Séance ${session.module.name} de ${format(start, 'HH:mm', { locale: fr })} à ${format(end, 'HH:mm', { locale: fr })}, ${STATUS_LABEL[status]}`}
                className="group flex w-full items-center gap-3 rounded-xl border bg-surface px-4 py-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:hover:shadow-none"
                style={{ borderColor: palette.border }}
              >
                <span
                  aria-hidden
                  className="h-12 w-1 flex-shrink-0 rounded-full"
                  style={{ background: palette.bar }}
                />
                <div className="flex w-16 flex-shrink-0 flex-col text-sm font-semibold tabular-nums text-text">
                  <span>{format(start, 'HH:mm', { locale: fr })}</span>
                  <span className="text-xs font-medium text-text-faint">
                    {format(end, 'HH:mm', { locale: fr })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-display text-sm font-semibold"
                    style={{ color: palette.text }}
                  >
                    {session.module.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-sec">
                    {session.classe.code} · {session.type}
                  </p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-text-faint">
                    <MapPinIcon size={11} color="currentColor" />
                    {session.salle.name}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
