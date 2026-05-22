import { differenceInMinutes, format } from 'date-fns';
import { AlertTriangleIcon, MapPinIcon, UserSmallIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { paletteForSession } from '@/lib/module-palette';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: SessionDto;
  onClick?: ((session: SessionDto) => void) | undefined;
  style?: React.CSSProperties | undefined;
  hasConflict?: boolean | undefined;
}

function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

export function SessionCard({ session, onClick, style, hasConflict = false }: SessionCardProps) {
  const palette = paletteForSession(session.module.id, session.type);
  const unpublished = !session.isPublished;
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const startLabel = format(start, 'HH:mm');
  const endLabel = format(end, 'HH:mm');
  const duration = formatDuration(start, end);

  const cardBg = hasConflict ? '#FEF2F2' : palette.bg;
  const barColor = hasConflict ? '#DC2626' : palette.bar;
  const textColor = hasConflict ? '#991B1B' : palette.text;

  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(session) : undefined}
      style={{ ...style, background: cardBg, color: textColor }}
      aria-label={`Séance ${session.module.name} de ${startLabel} à ${endLabel}${
        unpublished ? ' (non publiée)' : ''
      }${hasConflict ? ' (conflit)' : ''}`}
      className={cn(
        'group relative w-full overflow-hidden rounded-md text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        unpublished ? 'border border-dashed border-warn-text' : 'border-0',
      )}
    >
      {/* Left vertical color bar (4px) */}
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: barColor }} aria-hidden />

      <div className="flex h-full flex-col gap-1 px-2.5 py-2 pl-3.5">
        {/* Title row + non-published indicator */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[13px] font-bold leading-tight"
              style={{ color: textColor }}
            >
              {session.module.name}
            </div>
            <div className="mt-1">
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: '#FFFFFF', color: textColor }}
              >
                {session.classe.code}
              </span>
            </div>
          </div>
          {hasConflict ? (
            <span
              className="flex flex-shrink-0 text-err"
              title="Conflit détecté"
              aria-label="Conflit"
            >
              <AlertTriangleIcon size={12} color="currentColor" />
            </span>
          ) : null}
          {!hasConflict && unpublished ? (
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
        <div
          className="mt-0.5 flex items-baseline gap-2 text-[11px] font-medium"
          style={{ color: textColor, opacity: 0.85 }}
        >
          <span>
            {startLabel} – {endLabel}
          </span>
          <span style={{ opacity: 0.65 }}>· {duration}</span>
        </div>

        {/* Meta : teacher + room */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]"
          style={{ color: textColor, opacity: 0.78 }}
        >
          <span className="inline-flex items-center gap-1">
            <UserSmallIcon size={11} color="currentColor" />
            <span className="truncate">{session.teacher.fullName}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPinIcon size={11} color="currentColor" />
            <span className="truncate">{session.salle.name}</span>
          </span>
        </div>
      </div>
    </button>
  );
}
