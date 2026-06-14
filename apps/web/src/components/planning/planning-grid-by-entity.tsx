'use client';

import { useEffect, useRef, useState } from 'react';
import { differenceInMinutes, getHours, getMinutes } from 'date-fns';
import type { SessionV2Dto } from '@planit/contracts';
import { paletteForSessionV2 } from '@/lib/module-palette';
import { useUpdateSessionV2Mutation } from '@/lib/mutations-v2';
import { cn } from '@/lib/utils';
import { SessionCard } from './session-card';
import type { ReferentielDim } from './referentiel-combobox';

// Axe temps partagé avec la grille semaine (mêmes constantes pour la cohérence).
const DAY_START = 8;
const DAY_END = 20;
const HOUR_HEIGHT = 78;
const SNAP = 0.5;
const GRID_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2;
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

export interface ByEntityColumn {
  id: string;
  label: string;
  sub?: string | undefined;
}

interface PlanningGridByEntityProps {
  dimension: ReferentielDim;
  /** Jour affiché (date réelle, lundi+activeDay). */
  day: Date;
  /** Colonnes = entités (classes / salles / enseignants). */
  columns: readonly ByEntityColumn[];
  /** Séances de la semaine (filtrées au jour ci-dessous en interne). */
  sessions: readonly SessionV2Dto[];
  isLoading: boolean;
  onSessionOpen?: ((session: SessionV2Dto) => void) | undefined;
  /** Création sur cellule vide : jour + plage + entité de la colonne (préremplissage). */
  onCreateAtSlot?:
    | ((init: {
        date: Date;
        startTime: string;
        endTime: string;
        prefill: { classeId?: string; salleId?: string; enseignantId?: string };
      }) => void)
    | undefined;
  readOnly?: boolean | undefined;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function snap(h: number): number {
  return Math.round(h / SNAP) * SNAP;
}
function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startHourOf(s: SessionV2Dto): number {
  const d = new Date(s.startAt);
  return getHours(d) + getMinutes(d) / 60;
}
function durationHoursOf(s: SessionV2Dto): number {
  return differenceInMinutes(new Date(s.endAt), new Date(s.startAt)) / 60;
}

/** Ids de colonnes auxquelles appartient la séance selon la dimension. */
function columnIdsOf(s: SessionV2Dto, dim: ReferentielDim): string[] {
  if (dim === 'classe') return s.classes.map((c) => c.id);
  if (dim === 'salle') return s.salle ? [s.salle.id] : [];
  return s.enseignant ? [s.enseignant.id] : [];
}

interface DragState {
  session: SessionV2Dto;
  grabOffsetY: number;
}
interface DropPreview {
  colId: string;
  startHour: number;
}

/**
 * V05 LOT 7 (réf. PLANIT-IA vues `byclass/byroom/byteacher`) — grille planning
 * **mono-jour, multi-colonnes** (une colonne par classe/salle/enseignant).
 * Éditable : déplacement vertical (heure), drop cross-colonne (réaffecte la
 * dimension), création sur cellule vide. Les séances masquées (vue Salle, autre
 * RP) sont non interactives.
 */
export function PlanningGridByEntity({
  dimension,
  day,
  columns,
  sessions,
  isLoading,
  onSessionOpen,
  onCreateAtSlot,
  readOnly = false,
}: PlanningGridByEntityProps) {
  const { mutate: updateSession } = useUpdateSessionV2Mutation();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [hover, setHover] = useState<{ colId: string; startHour: number } | null>(null);
  const resizeRef = useRef<{
    sessionId: string;
    edge: 'top' | 'bottom';
    baseY: number;
    baseStartHour: number;
    baseEndHour: number;
    startDate: Date;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    sessionId: string;
    startHour: number;
    endHour: number;
  } | null>(null);

  // Séances du jour affiché uniquement.
  const daySessions = sessions.filter((s) => sameDay(new Date(s.startAt), day));

  function startHourFromEvent(e: React.DragEvent<HTMLDivElement>, d: DragState): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const topPx = e.clientY - rect.top - d.grabOffsetY;
    const durationH = durationHoursOf(d.session);
    return clamp(snap(DAY_START + topPx / HOUR_HEIGHT), DAY_START, DAY_END - durationH);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, colId: string) {
    if (readOnly || !drag) return;
    e.preventDefault();
    const startHour = startHourFromEvent(e, drag);
    const s = drag.session;
    setDrag(null);
    setDropPreview(null);

    const durationH = durationHoursOf(s);
    const newStart = new Date(day);
    newStart.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationH * 3_600_000);

    // Réaffectation de dimension si la colonne cible diffère.
    const currentCols = columnIdsOf(s, dimension);
    const dimChanged = !currentCols.includes(colId);
    const body: Record<string, unknown> = {
      startAt: newStart.toISOString(),
      endAt: newEnd.toISOString(),
    };
    if (dimChanged) {
      if (dimension === 'classe') body['classeIds'] = [colId];
      else if (dimension === 'salle') body['salleId'] = colId;
      else body['enseignantId'] = colId;
    }
    updateSession({ id: s.id, body });
  }

  // Resize (poignées) — suit la souris, applique au relâchement.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const r = resizeRef.current;
      if (!r) return;
      const deltaH = (e.clientY - r.baseY) / HOUR_HEIGHT;
      let startHour = r.baseStartHour;
      let endHour = r.baseEndHour;
      if (r.edge === 'top')
        startHour = clamp(snap(r.baseStartHour + deltaH), DAY_START, r.baseEndHour - SNAP);
      else endHour = clamp(snap(r.baseEndHour + deltaH), r.baseStartHour + SNAP, DAY_END);
      setResizePreview({ sessionId: r.sessionId, startHour, endHour });
    }
    function onUp() {
      const r = resizeRef.current;
      resizeRef.current = null;
      setResizePreview((prev) => {
        if (r && prev && (prev.startHour !== r.baseStartHour || prev.endHour !== r.baseEndHour)) {
          const ns = new Date(r.startDate);
          ns.setHours(Math.floor(prev.startHour), Math.round((prev.startHour % 1) * 60), 0, 0);
          const ne = new Date(r.startDate);
          ne.setHours(Math.floor(prev.endHour), Math.round((prev.endHour % 1) * 60), 0, 0);
          updateSession({
            id: r.sessionId,
            body: { startAt: ns.toISOString(), endAt: ne.toISOString() },
          });
        }
        return null;
      });
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [updateSession]);

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-surface px-6 text-center text-sm text-text-muted">
        Aucun référentiel à afficher pour cette vue.
      </div>
    );
  }

  return (
    <div className="scrollbar-hide h-full overflow-auto bg-surface">
      <div
        className="grid"
        style={{ gridTemplateColumns: `44px repeat(${columns.length}, minmax(180px, 1fr))` }}
      >
        {/* Header */}
        <div className="sticky left-0 top-0 z-30 h-[42px] border-b border-r border-border-soft bg-surface" />
        {columns.map((col) => (
          <div
            key={col.id}
            className="sticky top-0 z-20 flex h-[42px] flex-col justify-center border-b border-r border-border-soft bg-surface px-2.5 text-center"
          >
            <span className="truncate text-[11px] font-semibold leading-tight text-text">
              {col.label}
            </span>
            {col.sub ? (
              <span className="truncate text-[10px] leading-tight text-text-muted">{col.sub}</span>
            ) : null}
          </div>
        ))}

        {/* Rail heures */}
        <div
          className="sticky left-0 z-10 border-r border-border-soft bg-surface"
          style={{ height: GRID_HEIGHT }}
        >
          {HOURS.filter((h) => (h - DAY_START) % 2 === 0).map((hour) => (
            <div
              key={hour}
              className="absolute pr-1.5 pt-0.5 text-[9px] font-medium tabular-nums text-text-muted"
              style={{ top: (hour - DAY_START) * HOUR_HEIGHT, right: 0 }}
            >
              {hour}h
            </div>
          ))}
        </div>

        {/* Colonnes entités */}
        {columns.map((col) => {
          const colSessions = daySessions.filter((s) => columnIdsOf(s, dimension).includes(col.id));
          const isDropCol = dropPreview?.colId === col.id;
          return (
            <div
              key={col.id}
              className={cn(
                'relative border-r border-border transition-colors',
                isDropCol && 'bg-primary-50/60',
              )}
              style={{ height: GRID_HEIGHT }}
              onDragOver={(e) => {
                if (readOnly || !drag) return;
                e.preventDefault();
                setDropPreview({ colId: col.id, startHour: startHourFromEvent(e, drag) });
              }}
              onDrop={(e) => handleDrop(e, col.id)}
              onMouseMove={(e) => {
                if (readOnly || drag || resizePreview) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const blockStart = clamp(
                  DAY_START + Math.floor(y / HOUR_HEIGHT / 1) * 1,
                  DAY_START,
                  DAY_END - 1,
                );
                setHover({ colId: col.id, startHour: blockStart });
              }}
              onMouseLeave={() => setHover((h) => (h?.colId === col.id ? null : h))}
            >
              {/* lignes d'heures */}
              {HOURS.slice(0, -1).map((hour) => (
                <div
                  key={hour}
                  className={cn(
                    'absolute inset-x-0 h-px',
                    hour % 2 === 0 ? 'bg-border' : 'bg-border-soft',
                  )}
                  style={{ top: (hour - DAY_START) * HOUR_HEIGHT }}
                  aria-hidden
                />
              ))}

              {/* aperçu drop */}
              {drag && dropPreview && dropPreview.colId === col.id ? (
                <div
                  className="pointer-events-none absolute inset-x-1 rounded-[10px] border-2 border-dashed border-primary bg-primary-50"
                  style={{
                    top: (dropPreview.startHour - DAY_START) * HOUR_HEIGHT,
                    height: durationHoursOf(drag.session) * HOUR_HEIGHT - 4,
                  }}
                  aria-hidden
                />
              ) : null}

              {/* bouton + sur cellule vide survolée */}
              {!readOnly && hover && hover.colId === col.id && onCreateAtSlot ? (
                <button
                  type="button"
                  className="absolute inset-x-1 z-[5] flex items-center justify-center rounded-[10px] border border-dashed border-primary-200 bg-primary-50/40 text-primary transition-colors hover:bg-primary-50"
                  style={{
                    top: (hover.startHour - DAY_START) * HOUR_HEIGHT,
                    height: HOUR_HEIGHT - 4,
                  }}
                  onClick={() => {
                    const prefill =
                      dimension === 'classe'
                        ? { classeId: col.id }
                        : dimension === 'salle'
                          ? { salleId: col.id }
                          : { enseignantId: col.id };
                    onCreateAtSlot({
                      date: day,
                      startTime: fmtHour(hover.startHour),
                      endTime: fmtHour(Math.min(hover.startHour + 1, DAY_END)),
                      prefill,
                    });
                  }}
                  aria-label={`Créer une séance à ${fmtHour(hover.startHour)}`}
                >
                  <span className="text-lg font-bold">+</span>
                </button>
              ) : null}

              {/* séances */}
              {isLoading
                ? null
                : colSessions.map((s) => {
                    const rp = resizePreview?.sessionId === s.id ? resizePreview : null;
                    const sh = rp ? rp.startHour : startHourOf(s);
                    const eh = rp ? rp.endHour : sh + durationHoursOf(s);
                    const top = (sh - DAY_START) * HOUR_HEIGHT;
                    const height = Math.max(28, (eh - sh) * HOUR_HEIGHT - 4);
                    const barColor = paletteForSessionV2(s.module?.color ?? null, s.type).bar;
                    const editable = !readOnly && !s.masked;
                    return (
                      <div
                        key={`${col.id}:${s.id}`}
                        className="group/wrap absolute inset-x-1"
                        style={{ top, height }}
                        onDragEnd={() => {
                          setDrag(null);
                          setDropPreview(null);
                        }}
                      >
                        <SessionCard
                          session={s}
                          onOpen={s.masked ? undefined : onSessionOpen}
                          {...(editable
                            ? {
                                onDragStart: (sess, e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setDrag({ session: sess, grabOffsetY: e.clientY - rect.top });
                                  e.dataTransfer.effectAllowed = 'move';
                                },
                              }
                            : {})}
                        />
                        {editable ? (
                          <>
                            <ResizeHandle
                              edge="top"
                              color={barColor}
                              onMouseDown={(e) => startResize(s, 'top', e)}
                            />
                            <ResizeHandle
                              edge="bottom"
                              color={barColor}
                              onMouseDown={(e) => startResize(s, 'bottom', e)}
                            />
                          </>
                        ) : null}
                      </div>
                    );
                  })}
            </div>
          );
        })}
      </div>
    </div>
  );

  function startResize(s: SessionV2Dto, edge: 'top' | 'bottom', e: React.MouseEvent) {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const start = new Date(s.startAt);
    const end = new Date(s.endAt);
    resizeRef.current = {
      sessionId: s.id,
      edge,
      baseY: e.clientY,
      baseStartHour: getHours(start) + getMinutes(start) / 60,
      baseEndHour: getHours(end) + getMinutes(end) / 60,
      startDate: start,
    };
    setResizePreview({
      sessionId: s.id,
      startHour: getHours(start) + getMinutes(start) / 60,
      endHour: getHours(end) + getMinutes(end) / 60,
    });
  }
}

function ResizeHandle({
  edge,
  color,
  onMouseDown,
}: {
  edge: 'top' | 'bottom';
  color: string;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'absolute inset-x-2 z-10 flex h-2.5 cursor-ns-resize items-center justify-center',
        edge === 'top' ? 'top-0' : 'bottom-0',
      )}
      aria-hidden
    >
      <div
        className="h-[3px] w-7 rounded-full opacity-0 transition-opacity group-hover/wrap:opacity-70"
        style={{ background: color }}
      />
    </div>
  );
}
