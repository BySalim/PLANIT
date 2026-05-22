import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPinIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { paletteForSession } from '@/lib/module-palette';

export interface HeroCurrentSessionProps {
  readonly sessions: readonly SessionDto[];
  readonly now?: Date;
}

function findCurrent(sessions: readonly SessionDto[], now: Date): SessionDto | null {
  const ts = now.getTime();
  return (
    sessions.find((s) => {
      const start = new Date(s.startAt).getTime();
      const end = new Date(s.endAt).getTime();
      return start <= ts && ts < end;
    }) ?? null
  );
}

function findNext(sessions: readonly SessionDto[], now: Date): SessionDto | null {
  const ts = now.getTime();
  return (
    [...sessions]
      .filter((s) => new Date(s.startAt).getTime() > ts)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null
  );
}

export function HeroCurrentSession({ sessions, now = new Date() }: HeroCurrentSessionProps) {
  const current = findCurrent(sessions, now);

  if (current === null) {
    const next = findNext(sessions, now);
    return (
      <section
        aria-labelledby="hero-empty-title"
        className="rounded-2xl border border-border bg-surface px-6 py-8"
      >
        <p id="hero-empty-title" className="font-display text-lg font-semibold text-text">
          Aucune séance en cours
        </p>
        {next !== null ? (
          <p className="mt-2 text-sm text-text-sec">
            Prochaine séance : <span className="font-semibold text-text">{next.module.name}</span> à{' '}
            {format(new Date(next.startAt), 'HH:mm', { locale: fr })} en {next.salle.name}.
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-sec">
            Pas d&apos;autre séance prévue aujourd&apos;hui.
          </p>
        )}
      </section>
    );
  }

  const palette = paletteForSession(current.module.id, current.type);
  const start = new Date(current.startAt);
  const end = new Date(current.endAt);

  return (
    <section
      aria-labelledby="hero-current-title"
      className="relative overflow-hidden rounded-2xl border shadow-sm"
      style={{ background: palette.bg, borderColor: palette.border, color: palette.text }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: palette.bar }}
      />
      <div className="flex flex-col gap-3 px-6 py-6 pl-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-2 animate-pulse rounded-full"
              style={{ background: palette.bar }}
            />
            <span
              className="text-[10.5px] font-bold uppercase tracking-wider"
              style={{ color: palette.bar }}
            >
              En cours
            </span>
          </div>
          <h2
            id="hero-current-title"
            className="mt-1 font-display text-xl font-semibold leading-tight sm:text-2xl"
            style={{ color: palette.text }}
          >
            {current.module.name}
          </h2>
          <p className="mt-1 text-sm" style={{ color: palette.text, opacity: 0.75 }}>
            {current.classe.code} · {current.type}
          </p>
          <div
            className="mt-3 flex items-center gap-2 text-sm font-medium tabular-nums"
            style={{ color: palette.text }}
          >
            <span className="text-base font-bold">
              {format(start, 'HH:mm', { locale: fr })} – {format(end, 'HH:mm', { locale: fr })}
            </span>
            <span aria-hidden style={{ opacity: 0.5 }}>
              ·
            </span>
            <MapPinIcon size={14} color="currentColor" />
            <span style={{ opacity: 0.85 }}>{current.salle.name}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
