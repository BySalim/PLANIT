import { differenceInMinutes, format } from 'date-fns';
import { AlertTriangleIcon, MapPinIcon, UserSmallIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { categoryForType, paletteForSession, type SessionCategory } from '@/lib/module-palette';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: SessionDto;
  selected?: boolean | undefined;
  isDragging?: boolean | undefined;
  onSelect?: ((session: SessionDto) => void) | undefined;
  onOpen?: ((session: SessionDto) => void) | undefined;
  onDragStart?:
    | ((session: SessionDto, event: React.DragEvent<HTMLButtonElement>) => void)
    | undefined;
  hasConflict?: boolean | undefined;
}

// Libellé de catégorie affiché en bas-droite de la carte (calqué sur le proto).
const CATEGORY_LABEL: Record<SessionCategory, string> = {
  cours: 'Cours',
  evaluation: 'Eval',
  evenement: 'Event',
};

function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

export function SessionCard({
  session,
  selected = false,
  isDragging = false,
  onSelect,
  onOpen,
  onDragStart,
  hasConflict = false,
}: SessionCardProps) {
  const palette = paletteForSession(session.module.id, session.type);
  const unpublished = !session.isPublished;
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const startLabel = format(start, 'HH:mm');
  const endLabel = format(end, 'HH:mm');
  const duration = formatDuration(start, end);
  const categoryLabel = CATEGORY_LABEL[categoryForType(session.type)];

  const cardBg = hasConflict ? '#FEF2F2' : palette.bg;
  const barColor = hasConflict ? '#DC2626' : palette.bar;
  const textColor = hasConflict ? '#991B1B' : palette.text;

  return (
    <button
      type="button"
      draggable={onDragStart !== undefined}
      onClick={onSelect ? () => onSelect(session) : undefined}
      onDoubleClick={onOpen ? () => onOpen(session) : undefined}
      onDragStart={onDragStart ? (event) => onDragStart(session, event) : undefined}
      style={{
        background: cardBg,
        color: textColor,
        ...(selected ? { boxShadow: `0 0 0 2px ${barColor}` } : {}),
      }}
      aria-label={`Séance ${session.module.name} de ${startLabel} à ${endLabel}${
        unpublished ? ' (non publiée)' : ''
      }${hasConflict ? ' (conflit)' : ''}`}
      className={cn(
        'group relative h-full w-full overflow-hidden rounded-[10px] text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        !selected && 'shadow-sm hover:shadow-md',
        onDragStart !== undefined && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        unpublished ? 'border border-dashed border-warn-text' : 'border-0',
      )}
    >
      {/* Left vertical color bar (4px) */}
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: barColor }} aria-hidden />

      <div className="flex h-full gap-1.5 px-2.5 py-1.5 pl-3">
        {/* Left : title + class + time + meta */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="truncate text-[13px] font-bold leading-tight"
            style={{ color: textColor }}
          >
            {session.module.name}
          </div>

          <div className="mt-1">
            <span className="inline-flex h-4 items-center rounded-[3px] bg-white/75 px-1.5 text-[10.5px] font-semibold text-text">
              {session.classe.code}
            </span>
          </div>

          <div
            className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap text-[11.5px] font-medium tabular-nums"
            style={{ color: textColor, opacity: 0.85 }}
          >
            <span>
              {startLabel}&nbsp;–&nbsp;{endLabel}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span className="font-semibold">{duration}</span>
          </div>

          <div
            className="mt-1 flex items-center gap-1 truncate text-[11.5px]"
            style={{ color: textColor, opacity: 0.75 }}
          >
            <UserSmallIcon size={11} color="currentColor" />
            <span className="truncate">{session.teacher.fullName}</span>
          </div>

          <div
            className="mt-1 flex items-center gap-1 truncate text-[11.5px]"
            style={{ color: textColor, opacity: 0.75 }}
          >
            <MapPinIcon size={11} color="currentColor" />
            <span className="truncate">{session.salle.name}</span>
          </div>
        </div>

        {/* Right : status marker (top) + category badge (bottom) */}
        <div className="flex flex-shrink-0 flex-col items-end justify-between">
          <span className="flex h-3.5 items-center">
            {hasConflict ? (
              <span className="text-err" title="Conflit détecté" aria-label="Conflit">
                <AlertTriangleIcon size={13} color="currentColor" />
              </span>
            ) : unpublished ? (
              <span
                className="size-2 rounded-full bg-warn-text"
                title="Modifications non publiées"
                aria-hidden
              />
            ) : null}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {categoryLabel}
          </span>
        </div>
      </div>
    </button>
  );
}
