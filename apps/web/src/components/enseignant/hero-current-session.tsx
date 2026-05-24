import { differenceInMinutes, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPinIcon, UserSmallIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { now as nowDakar } from '@planit/utils/date';

export interface HeroCurrentSessionProps {
  readonly sessions: readonly SessionDto[];
  readonly now?: Date;
  /** 'teacher' (défaut) : badge classe · 'student' : nom du prof. */
  readonly variant?: 'teacher' | 'student';
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

function formatEndsIn(end: Date, now: Date): string {
  const minutes = differenceInMinutes(end, now);
  if (minutes <= 0) return 'Terminée';
  if (minutes < 60) return `Fin dans ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `Fin dans ${hours} h`;
  return `Fin dans ${hours}h ${String(rest).padStart(2, '0')}`;
}

function computeProgressPct(start: Date, end: Date, now: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  const pct = (elapsed / total) * 100;
  return Math.max(0, Math.min(100, pct));
}

const CATEGORY_LABEL: Record<SessionDto['type'], string> = {
  CM: 'Cours',
  TD: 'Cours',
  TP: 'Cours',
  EXAM: 'Éval',
  RATTRAP: 'Éval',
  DEVOIR: 'Éval',
  EVENT: 'Événement',
};

export function HeroCurrentSession({
  sessions,
  now = nowDakar(),
  variant = 'teacher',
}: HeroCurrentSessionProps) {
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

  const start = new Date(current.startAt);
  const end = new Date(current.endAt);
  const progressPct = computeProgressPct(start, end, now);
  const endsInLabel = formatEndsIn(end, now);
  const categoryLabel = CATEGORY_LABEL[current.type];

  return (
    <section
      aria-labelledby="hero-current-title"
      className="bg-brand-gradient-warm relative overflow-hidden rounded-2xl text-white shadow-[0_8px_24px_-8px_rgba(107,45,14,0.45)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(232,98,10,0.4) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col gap-3 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-white" />
            En cours
          </span>
          <span className="text-[12.5px] font-semibold tabular-nums text-white/90">
            {endsInLabel}
          </span>
        </div>

        <h2
          id="hero-current-title"
          className="font-display text-xl font-semibold leading-tight tracking-tight sm:text-[22px]"
        >
          {current.module.name}
        </h2>

        {variant === 'teacher' ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-md border border-white/30 bg-white/[0.18] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white">
              {current.classe.code}
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-3 text-[13px] text-white/80">
          {variant === 'student' ? (
            <span className="inline-flex items-center gap-1.5">
              <UserSmallIcon size={13} color="currentColor" />
              <span>{current.teacher.fullName}</span>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon size={13} color="currentColor" />
            <span>{current.salle.name}</span>
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[13px] font-medium tabular-nums text-white/80">
            {format(start, 'HH:mm', { locale: fr })} – {format(end, 'HH:mm', { locale: fr })}
          </span>
          <span className="rounded-md bg-white/[0.18] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {categoryLabel}
          </span>
        </div>

        <div
          className="h-1 overflow-hidden rounded-full bg-white/[0.18]"
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avancement de la séance"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
