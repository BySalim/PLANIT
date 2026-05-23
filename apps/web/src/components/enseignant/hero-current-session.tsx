import { differenceInMinutes, format } from 'date-fns';
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

function formatRemaining(end: Date, now: Date): string {
  const minutes = differenceInMinutes(end, now);
  if (minutes <= 0) return 'Terminée';
  if (minutes < 60) return `Encore ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `Encore ${hours} h`;
  return `Encore ${hours} h ${String(rest).padStart(2, '0')}`;
}

function computeProgressPct(start: Date, end: Date, now: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  const pct = (elapsed / total) * 100;
  return Math.max(0, Math.min(100, pct));
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
  const progressPct = computeProgressPct(start, end, now);
  const remainingLabel = formatRemaining(end, now);

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
      <div className="flex flex-col gap-3 px-6 py-6 pl-8">
        {/* Header : badge EN COURS + temps restant */}
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-white" />
            En cours
          </span>
          <span
            className="text-[12.5px] font-semibold tabular-nums"
            style={{ color: palette.text, opacity: 0.85 }}
          >
            {remainingLabel}
          </span>
        </div>

        {/* Titre module + classe/type */}
        <div>
          <h2
            id="hero-current-title"
            className="font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl"
            style={{ color: palette.text }}
          >
            {current.module.name}
          </h2>
          <p className="mt-1 text-sm" style={{ color: palette.text, opacity: 0.75 }}>
            {current.classe.code} · {current.type}
          </p>
        </div>

        {/* Lieu */}
        <div
          className="flex items-center gap-1.5 text-sm"
          style={{ color: palette.text, opacity: 0.85 }}
        >
          <MapPinIcon size={14} color="currentColor" />
          <span>{current.salle.name}</span>
        </div>

        {/* Horaire + type pill */}
        <div className="flex items-center justify-between">
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: palette.text, opacity: 0.85 }}
          >
            {format(start, 'HH:mm', { locale: fr })} – {format(end, 'HH:mm', { locale: fr })}
          </span>
          <span
            className="rounded px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(255,255,255,0.55)', color: palette.text }}
          >
            {current.type}
          </span>
        </div>

        {/* Barre de progression */}
        <div
          className="h-1 overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.45)' }}
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avancement de la séance"
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%`, background: palette.bar }}
          />
        </div>
      </div>
    </section>
  );
}
