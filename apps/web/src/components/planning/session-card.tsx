import { format } from 'date-fns';
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
  badge: string;
}

const TYPE_STYLES: Record<SessionType, TypeStyle> = {
  CM: {
    bar: 'bg-primary',
    bg: 'bg-primary-50',
    text: 'text-primary',
    badge: 'bg-primary text-surface',
  },
  TD: {
    bar: 'bg-accent',
    bg: 'bg-accent-100',
    text: 'text-accent-800',
    badge: 'bg-accent text-surface',
  },
  TP: {
    bar: 'bg-info',
    bg: 'bg-info-100',
    text: 'text-info',
    badge: 'bg-info text-surface',
  },
  EXAM: {
    bar: 'bg-err',
    bg: 'bg-err-100',
    text: 'text-err',
    badge: 'bg-err text-surface',
  },
  RATTRAP: {
    bar: 'bg-err',
    bg: 'bg-err-100',
    text: 'text-err',
    badge: 'bg-err text-surface',
  },
  DEVOIR: {
    bar: 'bg-warn-text',
    bg: 'bg-warn',
    text: 'text-warn-text',
    badge: 'bg-warn-text text-surface',
  },
  EVENT: {
    bar: 'bg-event',
    bg: 'bg-event-100',
    text: 'text-event-text',
    badge: 'bg-event text-surface',
  },
};

export function SessionCard({ session, onClick, style }: SessionCardProps) {
  const typeStyle = TYPE_STYLES[session.type];
  const unpublished = !session.isPublished;
  const startLabel = format(new Date(session.startAt), 'HH:mm');
  const endLabel = format(new Date(session.endAt), 'HH:mm');

  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(session) : undefined}
      style={style}
      aria-label={`Séance ${session.module.code} ${session.type} de ${startLabel} à ${endLabel}${unpublished ? ' (non publiée)' : ''}`}
      className={cn(
        'group relative w-full overflow-hidden rounded-md border bg-surface text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        unpublished ? 'border-dashed border-warn-text' : 'border-border',
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1', typeStyle.bar)} aria-hidden />
      <div className={cn('flex h-full flex-col gap-1 p-2 pl-3', typeStyle.bg)}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none',
              typeStyle.badge,
            )}
          >
            {session.type}
          </span>
          {unpublished ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-warn-text"
              title="Modifications non publiées"
            >
              <span className="size-1.5 rounded-full bg-warn-text" aria-hidden />
              Non publiée
            </span>
          ) : null}
        </div>
        <div className={cn('truncate text-xs font-semibold', typeStyle.text)}>
          {session.module.code}
        </div>
        <div className="truncate text-[11px] text-text-sec">
          {session.classe.code} · {session.salle.name}
        </div>
        <div className="mt-auto truncate text-[11px] font-medium text-text-muted">
          {startLabel} – {endLabel}
        </div>
      </div>
    </button>
  );
}
