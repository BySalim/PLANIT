import { differenceInMinutes, format } from 'date-fns';
import { MapPinIcon, UserSmallIcon } from '@planit/ui';
import type { SessionDto, SessionType } from '@planit/contracts';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: SessionDto;
  onClick?: ((session: SessionDto) => void) | undefined;
  style?: React.CSSProperties | undefined;
}

interface TypeStyle {
  bar: string;
  bg: string;
  text: string;
}

// Color by type (V1). Once `module.color` exists in contracts, switch to a
// per-module palette (TD-015).
const TYPE_STYLES: Record<SessionType, TypeStyle> = {
  CM: { bar: 'bg-primary', bg: 'bg-primary-50', text: 'text-primary' },
  TD: { bar: 'bg-accent', bg: 'bg-accent-100', text: 'text-accent-800' },
  TP: { bar: 'bg-info', bg: 'bg-info-100', text: 'text-info' },
  EXAM: { bar: 'bg-err', bg: 'bg-err-100', text: 'text-err' },
  RATTRAP: { bar: 'bg-err', bg: 'bg-err-100', text: 'text-err' },
  DEVOIR: { bar: 'bg-warn-text', bg: 'bg-warn', text: 'text-warn-text' },
  EVENT: { bar: 'bg-event', bg: 'bg-event-100', text: 'text-event-text' },
};

function categoryOf(type: SessionType): 'cours' | 'eval' | 'event' {
  if (type === 'EXAM' || type === 'RATTRAP' || type === 'DEVOIR') return 'eval';
  if (type === 'EVENT') return 'event';
  return 'cours';
}

const CATEGORY_LABEL: Record<'cours' | 'eval' | 'event', string> = {
  cours: 'COURS',
  eval: 'ÉVAL',
  event: 'ÉVÉN.',
};

function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

export function SessionCard({ session, onClick, style }: SessionCardProps) {
  const typeStyle = TYPE_STYLES[session.type];
  const unpublished = !session.isPublished;
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const startLabel = format(start, 'HH:mm');
  const endLabel = format(end, 'HH:mm');
  const duration = formatDuration(start, end);
  const category = categoryOf(session.type);

  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(session) : undefined}
      style={style}
      aria-label={`Séance ${session.module.name} de ${startLabel} à ${endLabel}${
        unpublished ? ' (non publiée)' : ''
      }`}
      className={cn(
        'group relative w-full overflow-hidden rounded-md border bg-surface text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        unpublished ? 'border-dashed border-warn-text' : 'border-border',
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1', typeStyle.bar)} aria-hidden />
      <div className={cn('flex h-full flex-col gap-1 px-2.5 pb-2 pt-2 pl-3', typeStyle.bg)}>
        {/* Header: classe pill + non-published badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className={cn('truncate text-[13px] font-bold leading-tight', typeStyle.text)}>
              {session.module.name}
            </div>
            <div>
              <span className="inline-flex items-center rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {session.classe.code}
              </span>
            </div>
          </div>
          {unpublished ? (
            <span
              className="inline-flex flex-shrink-0 items-center gap-1 text-[10px] font-medium text-warn-text"
              title="Modifications non publiées"
            >
              <span className="size-1.5 rounded-full bg-warn-text" aria-hidden />
              Non publiée
            </span>
          ) : null}
        </div>

        {/* Time row */}
        <div className="mt-0.5 flex items-baseline gap-2 text-[11px] font-medium text-text-sec">
          <span>
            {startLabel} – {endLabel}
          </span>
          <span className="text-text-muted">· {duration}</span>
        </div>

        {/* Teacher row */}
        <div className="flex items-center gap-1.5 text-[11px] text-text-sec">
          <UserSmallIcon size={12} color="currentColor" />
          <span className="truncate">{session.teacher.fullName}</span>
        </div>

        {/* Room row */}
        <div className="flex items-center gap-1.5 text-[11px] text-text-sec">
          <MapPinIcon size={12} color="currentColor" />
          <span className="truncate">{session.salle.name}</span>
        </div>

        {/* Footer: category badge */}
        <div className="mt-auto flex justify-end pt-1">
          <span
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
              category === 'eval' && 'bg-err-100 text-err',
              category === 'event' && 'bg-event-100 text-event-text',
              category === 'cours' && 'bg-border-soft text-text-sec',
            )}
          >
            {CATEGORY_LABEL[category]}
          </span>
        </div>
      </div>
    </button>
  );
}
