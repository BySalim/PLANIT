import { differenceInMinutes, format } from 'date-fns';
import { AlertTriangleIcon, MapPinIcon, UserSmallIcon } from '@planit/ui';
import type { SessionTypeV2, SessionV2Dto } from '@planit/contracts';
import { paletteForSessionV2 } from '@/lib/module-palette';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: SessionV2Dto;
  selected?: boolean | undefined;
  isDragging?: boolean | undefined;
  onSelect?:
    | ((session: SessionV2Dto, event: React.MouseEvent<HTMLButtonElement>) => void)
    | undefined;
  onOpen?: ((session: SessionV2Dto) => void) | undefined;
  onDragStart?:
    | ((session: SessionV2Dto, event: React.DragEvent<HTMLButtonElement>) => void)
    | undefined;
  hasConflict?: boolean | undefined;
}

// Libellé de catégorie affiché en bas-droite de la carte. V2 — top-level type.
const CATEGORY_LABEL: Record<SessionTypeV2, string> = {
  COURS: 'Cours',
  EVALUATION: 'Eval',
  EVENEMENT: 'Event',
};

function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

/**
 * Carte séance V2 — affichée dans la grille planning RP.
 *
 * R.8 — l'indicateur "non publiée" est piloté par `hasUnpublishedChanges`
 * (backend autoritatif, ADR-0008), plus par `isPublished` legacy.
 *
 * V2-D6 — multi-classes : on affiche la 1ʳᵉ classe et "+N" si plusieurs.
 * V2-D5 — un EVENEMENT n'a ni module ni enseignant : on affiche le libellé
 * en tête (toujours requis) et `intervenantNom` à la place du prof.
 */
export function SessionCard({
  session,
  selected = false,
  isDragging = false,
  onSelect,
  onOpen,
  onDragStart,
  hasConflict = false,
}: SessionCardProps) {
  const palette = paletteForSessionV2(session.module?.id ?? null, session.type);
  const unpublished = session.hasUnpublishedChanges;
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const startLabel = format(start, 'HH:mm');
  const endLabel = format(end, 'HH:mm');
  const duration = formatDuration(start, end);
  const categoryLabel = CATEGORY_LABEL[session.type];

  // Titre principal : libellé (toujours), avec fallback sur le module.
  const title = session.libelle || session.module?.name || 'Séance';

  // Multi-classes : 1ʳᵉ classe + "+N" si plusieurs (V2-D6).
  const firstClasse = session.classes[0];
  const extraClassCount = session.classes.length - 1;
  const classLabel = firstClasse
    ? extraClassCount > 0
      ? `${firstClasse.code} +${extraClassCount}`
      : firstClasse.code
    : null;

  // Prof : enseignant pour Cours/Eval, intervenant pour Event (libre).
  const personLabel =
    session.type === 'EVENEMENT'
      ? (session.intervenantNom ?? null)
      : (session.enseignant?.nomComplet ?? null);

  // Conflit → palette d'erreur (les tokens err existent dans globals.css).
  const cardBg = hasConflict ? 'var(--color-err-100)' : palette.bg;
  const barColor = hasConflict ? 'var(--color-err)' : palette.bar;
  const textColor = hasConflict ? 'var(--color-err)' : palette.text;

  return (
    <button
      type="button"
      draggable={onDragStart !== undefined}
      onClick={
        onSelect
          ? (event) => {
              event.stopPropagation();
              onSelect(session, event);
            }
          : undefined
      }
      onDoubleClick={onOpen ? () => onOpen(session) : undefined}
      onDragStart={onDragStart ? (event) => onDragStart(session, event) : undefined}
      style={{
        background: cardBg,
        color: textColor,
        ...(selected ? { boxShadow: `0 0 0 2px ${barColor}` } : {}),
      }}
      aria-label={`Séance ${title} de ${startLabel} à ${endLabel}${
        unpublished ? ' (modifications non publiées)' : ''
      }${hasConflict ? ' (conflit)' : ''}`}
      className={cn(
        'group relative h-full w-full overflow-hidden rounded-[10px] text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        !selected && 'shadow-sm hover:shadow-md',
        onDragStart !== undefined && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        unpublished ? 'border border-dashed border-warn-text' : 'border-0',
      )}
    >
      {/* Bandeau coloré gauche (4 px) */}
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: barColor }} aria-hidden />

      <div className="flex h-full gap-1.5 px-2.5 py-1.5 pl-3">
        {/* Gauche : titre + classe + horaire + meta */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="truncate text-[13px] font-bold leading-tight"
            style={{ color: textColor }}
          >
            {title}
          </div>

          {classLabel ? (
            <div className="mt-1">
              <span className="inline-flex h-4 items-center rounded-[3px] bg-white/75 px-1.5 text-[10.5px] font-semibold text-text">
                {classLabel}
              </span>
            </div>
          ) : null}

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

          {personLabel ? (
            <div
              className="mt-1 flex items-center gap-1 truncate text-[11.5px]"
              style={{ color: textColor, opacity: 0.75 }}
            >
              <UserSmallIcon size={11} color="currentColor" />
              <span className="truncate">{personLabel}</span>
            </div>
          ) : null}

          {session.salle ? (
            <div
              className="mt-1 flex items-center gap-1 truncate text-[11.5px]"
              style={{ color: textColor, opacity: 0.75 }}
            >
              <MapPinIcon size={11} color="currentColor" />
              <span className="truncate">{session.salle.name}</span>
            </div>
          ) : null}
        </div>

        {/* Droite : marqueur statut (haut) + badge catégorie (bas) */}
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
