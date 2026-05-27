'use client';

import { useEffect, useRef, useState } from 'react';
import { addDays, differenceInMinutes, format, getHours, getMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChartIcon } from '@planit/ui';
import type { CreateSessionV2Dto, SessionV2Dto } from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { useCreateSessionV2Mutation, useUpdateSessionV2Mutation } from '@/lib/mutations-v2';
import { paletteForSessionV2 } from '@/lib/module-palette';
import { cn } from '@/lib/utils';
import { SessionCard } from './session-card';

interface PlanningGridProps {
  weekStart: Date;
  sessions: readonly SessionV2Dto[];
  isLoading: boolean;
  error: Error | null;
  /** Ouverture du détail d'une séance (double-clic). */
  onSessionOpen?: ((session: SessionV2Dto) => void) | undefined;
  onRetry?: (() => void) | undefined;
  /**
   * I.6 — push une entrée undo après une mutation réussie (drag / resize).
   * Le paste (Ctrl+V) reste hors undo en V02 (pas de mutation delete).
   */
  onPushUndo?:
    | ((entry: {
        readonly label: string;
        readonly undo: () => Promise<void> | void;
        readonly redo: () => Promise<void> | void;
      }) => void)
    | undefined;
  /**
   * I.1 / I.2 — création d'une séance depuis un créneau vide. Reçoit la date
   * (du jour cliqué) + plage horaire (snap 30 min). Le parent passe ça à
   * `<CreateSessionModal initialValues={...}>`.
   */
  onCreateAtSlot?:
    | ((init: {
        readonly date: Date;
        readonly startTime: string;
        readonly endTime: string;
      }) => void)
    | undefined;
}

const DAY_START = 8;
const DAY_END = 20;
const HOUR_HEIGHT = 78; // px/heure — calqué sur PLANIT-IA/rp (HOUR_H)
const DAY_COUNT = 7; // Lundi → Dimanche
const SNAP_HOURS = 0.5; // pas de calage du drag/resize/select = 30 min
// Bloc visuel = créneau de 2h aligné sur 8h/10h/12h/14h/16h/18h.
// Au survol on illumine ce bloc entier ; le bouton + apparaît en son centre.
// Le drag-select démarre lui sur double-clic et avance par tranches de 30 min.
const HOVER_BLOCK_HOURS = 2;
// 30 min de "gouffre" sous le dernier créneau pour la respiration visuelle.
const BOTTOM_PAD = HOUR_HEIGHT / 2;
const GRID_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT + BOTTOM_PAD;
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

/** Retourne le bloc 2h aligné qui contient `hour` (ex: 9.5 → 8, 11 → 10). */
function blockStartFor(hour: number): number {
  const offset = hour - DAY_START;
  return DAY_START + Math.floor(offset / HOVER_BLOCK_HOURS) * HOVER_BLOCK_HOURS;
}

interface PositionedSession {
  session: SessionV2Dto;
  dayIndex: number;
  top: number;
  height: number;
}

interface DragState {
  session: SessionV2Dto;
  /** Décalage vertical (px) entre le curseur et le haut de la carte saisie. */
  grabOffsetY: number;
}

interface DropPreview {
  dayIndex: number;
  startHour: number;
}

interface ResizeState {
  sessionId: string;
  edge: 'top' | 'bottom';
  baseY: number;
  baseStartHour: number;
  baseEndHour: number;
  startDate: Date;
  dayIndex: number;
}

interface ResizePreview {
  sessionId: string;
  dayIndex: number;
  startHour: number;
  endHour: number;
}

function sessionDurationHours(session: SessionV2Dto): number {
  return differenceInMinutes(new Date(session.endAt), new Date(session.startAt)) / 60;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function snap(hour: number): number {
  return Math.round(hour / SNAP_HOURS) * SNAP_HOURS;
}

// Heure décimale → "HH:mm" (8.5 → "08:30").
function fmtHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function positionSession(session: SessionV2Dto): PositionedSession | null {
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  // date-fns getDay: Sun=0, Mon=1, ..., Sat=6
  const jsDay = start.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0..Sun=6
  if (dayIndex >= DAY_COUNT) return null;

  const startHour = getHours(start) + getMinutes(start) / 60;
  const durationMinutes = differenceInMinutes(end, start);
  if (startHour < DAY_START || startHour >= DAY_END) return null;

  return {
    session,
    dayIndex,
    top: (startHour - DAY_START) * HOUR_HEIGHT,
    height: Math.max(28, (durationMinutes / 60) * HOUR_HEIGHT - 4),
  };
}

/**
 * Construit un payload CreateSessionV2Dto à partir d'une SessionV2Dto existante
 * (utilisé par le copier-coller Ctrl+V). Respecte la discriminated union sur
 * `type` — les champs spécifiques (module/enseignant pour Cours/Eval,
 * intervenant/description pour Event) sont passés depuis la source.
 */
function buildCopyPayload(
  source: SessionV2Dto,
  startAt: string,
  endAt: string,
): CreateSessionV2Dto | null {
  const classeIds = source.classes.map((c) => c.id);
  const salleId = source.salle?.id ?? null;
  const base = {
    libelle: source.libelle,
    classeIds,
    salleId,
    startAt,
    endAt,
  } as const;

  if (source.type === 'EVENEMENT') {
    return {
      type: 'EVENEMENT',
      intervenantNom: source.intervenantNom,
      description: source.description,
      ...base,
    };
  }

  // Cours / Evaluation : module + enseignant doivent exister sur la source.
  if (!source.module || !source.enseignant) return null;
  if (source.type === 'COURS') {
    return {
      type: 'COURS',
      ...(source.sousType !== null ? { sousType: source.sousType as 'CM' | 'TD' | 'TP' } : {}),
      moduleId: source.module.id,
      enseignantId: source.enseignant.id,
      ...base,
    };
  }
  // EVALUATION — sousType requis (V2-D4). Si null sur la source, fallback EXAMEN.
  return {
    type: 'EVALUATION',
    sousType: (source.sousType ?? 'EXAMEN') as 'EXAMEN' | 'RATTRAPAGE' | 'DEVOIR',
    moduleId: source.module.id,
    enseignantId: source.enseignant.id,
    ...base,
  };
}

export function PlanningGrid({
  weekStart,
  sessions,
  isLoading,
  error,
  onSessionOpen,
  onRetry,
  onPushUndo,
  onCreateAtSlot,
}: PlanningGridProps) {
  // I.3 — multi-sélection : `selectedIds` est un Set immuable. Ctrl/Meta+clic
  // toggle l'appartenance ; clic simple réduit la sélection à 1 élément.
  // Click hors d'une séance → vide la sélection.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  // I.5 — snapshot du Set sélectionné au Ctrl+C. Ctrl+V crée N séances
  // décalées par rapport à la position du curseur (le 1ᵉʳ élément = anchor).
  const [copiedSessions, setCopiedSessions] = useState<readonly SessionV2Dto[]>([]);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);
  // LOT 4 V2 — état unifié pour la sélection « créneau vide » :
  //  - hover (transient) : survol passif d'un bloc 2h libre, disparaît au mouseleave
  //  - pending (persistant) : sélection figée après un double-clic+drag ; reste
  //    visible jusqu'à un clic explicite (sur la zone = ouvre la modale, ailleurs
  //    = annule). Snap interne du drag-select = 30 min.
  type SlotSelection =
    | { kind: 'hover'; dayIndex: number; startHour: number; endHour: number }
    | { kind: 'pending'; dayIndex: number; startHour: number; endHour: number };
  const [slotSelection, setSlotSelection] = useState<SlotSelection | null>(null);
  // Drag-select actif : `null` quand on n'est pas en train de glisser. Démarre
  // sur `onDoubleClick` (mouseDown propre) puis suit la souris jusqu'au mouseUp.
  const [activeDrag, setActiveDrag] = useState<{
    dayIndex: number;
    anchorHour: number;
    endHour: number;
  } | null>(null);

  function handleSelect(session: SessionV2Dto, event: React.MouseEvent) {
    const isAdditive = event.ctrlKey || event.metaKey;
    setSelectedIds((prev) => {
      if (isAdditive) {
        const next = new Set(prev);
        if (next.has(session.id)) next.delete(session.id);
        else next.add(session.id);
        return next;
      }
      return new Set([session.id]);
    });
  }
  function clearSelection() {
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
  }

  // Escape désélectionne tout (V2 LOT 4 I.3) + annule un drag-select en cours
  // + annule une sélection pending de bloc vide.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      clearSelection();
      setActiveDrag(null);
      setSlotSelection(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /**
   * Vérifie qu'un intervalle [startHour, endHour] est libre : aucune séance
   * ne le chevauche. Utilisé pour valider :
   *  - un bloc de 2h au hover (`isRangeFree(d, 8, 10)`)
   *  - un range arbitraire pendant le drag-select
   */
  function isRangeFree(dayIndex: number, startHour: number, endHour: number): boolean {
    for (const s of sessions) {
      const sStart = new Date(s.startAt);
      const sDayIdx = sStart.getDay() === 0 ? 6 : sStart.getDay() - 1;
      if (sDayIdx !== dayIndex) continue;
      const sStartH = getHours(sStart) + getMinutes(sStart) / 60;
      const sEndH = sStartH + sessionDurationHours(s);
      // Chevauchement strict : refuser dès qu'une séance entame la plage.
      if (sStartH < endHour && sEndH > startHour) return false;
    }
    return true;
  }

  // Convertit la position curseur (Y dans la colonne) en heure snap 30 min.
  function hourFromY(y: number): number {
    return clamp(snap(DAY_START + y / HOUR_HEIGHT), DAY_START, DAY_END - SNAP_HOURS);
  }
  const { mutate: updateSession } = useUpdateSessionV2Mutation();
  const { mutate: pasteSession } = useCreateSessionV2Mutation();
  // Dernière position du curseur sur la grille — base du collage Ctrl+V.
  const lastMousePosRef = useRef<{ dayIndex: number; y: number } | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const resizePreviewRef = useRef<ResizePreview | null>(null);

  // Calcule l'heure de début calée à partir d'un événement de drag sur une colonne.
  function startHourFromEvent(
    event: React.DragEvent<HTMLDivElement>,
    dragState: DragState,
  ): number {
    const rect = event.currentTarget.getBoundingClientRect();
    const topPx = event.clientY - rect.top - dragState.grabOffsetY;
    const durationH = sessionDurationHours(dragState.session);
    return clamp(snap(DAY_START + topPx / HOUR_HEIGHT), DAY_START, DAY_END - durationH);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>, dayIndex: number) {
    if (!drag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropPreview({ dayIndex, startHour: startHourFromEvent(event, drag) });
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, dayIndex: number) {
    if (!drag) return;
    event.preventDefault();
    const startHour = startHourFromEvent(event, drag);
    const { session: anchor } = drag;
    const anchorOldStart = new Date(anchor.startAt);
    const anchorOldStartMs = anchorOldStart.getTime();
    const anchorOldDayIndex = anchorOldStart.getDay() === 0 ? 6 : anchorOldStart.getDay() - 1;

    const anchorNewStart = addDays(weekStart, dayIndex);
    anchorNewStart.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
    const anchorNewStartMs = anchorNewStart.getTime();

    setDrag(null);
    setDropPreview(null);
    // Pas de mutation si la séance est relâchée exactement à sa place initiale.
    if (anchorNewStartMs === anchorOldStartMs) return;

    // I.4 — batch : si l'anchor est dans la sélection multi, on déplace tout
    // le groupe en préservant les offsets relatifs (temps + jour). Sinon, on
    // déplace uniquement l'anchor (comportement V01).
    const group =
      selectedIds.has(anchor.id) && selectedIds.size > 1
        ? sessions.filter((s) => selectedIds.has(s.id))
        : [anchor];

    const deltaMs = anchorNewStartMs - anchorOldStartMs;
    const deltaDay = dayIndex - anchorOldDayIndex;

    // Snapshot avant/après pour undo.
    const moves = group.map((s) => {
      const oldStart = new Date(s.startAt);
      const oldEnd = new Date(s.endAt);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      const newStart = new Date(oldStart.getTime() + deltaMs);
      // Si le drag changeait de jour, propager le delta de jour à chaque membre.
      if (deltaDay !== 0) newStart.setDate(newStart.getDate() + deltaDay - 0); // déjà inclus dans deltaMs si même semaine
      const newEnd = new Date(newStart.getTime() + durationMs);
      return {
        id: s.id,
        oldStartIso: s.startAt,
        oldEndIso: s.endAt,
        newStartIso: newStart.toISOString(),
        newEndIso: newEnd.toISOString(),
      };
    });

    moves.forEach((m) => {
      updateSession({ id: m.id, body: { startAt: m.newStartIso, endAt: m.newEndIso } });
    });

    if (onPushUndo) {
      const label =
        moves.length === 1 ? 'Déplacement de séance' : `Déplacement de ${moves.length} séances`;
      onPushUndo({
        label,
        undo: async () => {
          await Promise.all(
            moves.map(
              (m) =>
                new Promise<void>((resolve) => {
                  updateSession(
                    { id: m.id, body: { startAt: m.oldStartIso, endAt: m.oldEndIso } },
                    { onSettled: () => resolve() },
                  );
                }),
            ),
          );
        },
        redo: async () => {
          await Promise.all(
            moves.map(
              (m) =>
                new Promise<void>((resolve) => {
                  updateSession(
                    { id: m.id, body: { startAt: m.newStartIso, endAt: m.newEndIso } },
                    { onSettled: () => resolve() },
                  );
                }),
            ),
          );
        },
      });
    }
  }

  function endDrag() {
    setDrag(null);
    setDropPreview(null);
  }

  // Démarre un redimensionnement depuis une poignée haut/bas d'une séance.
  function startResize(
    session: SessionV2Dto,
    edge: 'top' | 'bottom',
    dayIndex: number,
    event: React.MouseEvent,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const start = new Date(session.startAt);
    const end = new Date(session.endAt);
    const baseStartHour = getHours(start) + getMinutes(start) / 60;
    const baseEndHour = getHours(end) + getMinutes(end) / 60;
    resizeRef.current = {
      sessionId: session.id,
      edge,
      baseY: event.clientY,
      baseStartHour,
      baseEndHour,
      startDate: start,
      dayIndex,
    };
    const preview: ResizePreview = {
      sessionId: session.id,
      dayIndex,
      startHour: baseStartHour,
      endHour: baseEndHour,
    };
    resizePreviewRef.current = preview;
    setResizePreview(preview);
  }

  // Resize en cours : suit la souris au niveau document, calage 30 min,
  // applique la modification (PUT) au relâchement.
  useEffect(() => {
    function onMove(event: MouseEvent) {
      const r = resizeRef.current;
      if (!r) return;
      const deltaH = (event.clientY - r.baseY) / HOUR_HEIGHT;
      let startHour = r.baseStartHour;
      let endHour = r.baseEndHour;
      if (r.edge === 'top') {
        startHour = clamp(snap(r.baseStartHour + deltaH), DAY_START, r.baseEndHour - SNAP_HOURS);
      } else {
        endHour = clamp(snap(r.baseEndHour + deltaH), r.baseStartHour + SNAP_HOURS, DAY_END);
      }
      const preview: ResizePreview = {
        sessionId: r.sessionId,
        dayIndex: r.dayIndex,
        startHour,
        endHour,
      };
      resizePreviewRef.current = preview;
      setResizePreview(preview);
    }
    function onUp() {
      const r = resizeRef.current;
      const preview = resizePreviewRef.current;
      resizeRef.current = null;
      resizePreviewRef.current = null;
      setResizePreview(null);
      if (!r || !preview) return;
      if (preview.startHour === r.baseStartHour && preview.endHour === r.baseEndHour) return;
      const newStart = new Date(r.startDate);
      newStart.setHours(
        Math.floor(preview.startHour),
        Math.round((preview.startHour % 1) * 60),
        0,
        0,
      );
      const newEnd = new Date(r.startDate);
      newEnd.setHours(Math.floor(preview.endHour), Math.round((preview.endHour % 1) * 60), 0, 0);
      const newStartIso = newStart.toISOString();
      const newEndIso = newEnd.toISOString();

      // Capture l'ancien créneau pour pouvoir undo (avant la mutation).
      const oldStart = new Date(r.startDate);
      oldStart.setHours(Math.floor(r.baseStartHour), Math.round((r.baseStartHour % 1) * 60), 0, 0);
      const oldEnd = new Date(r.startDate);
      oldEnd.setHours(Math.floor(r.baseEndHour), Math.round((r.baseEndHour % 1) * 60), 0, 0);
      const oldStartIso = oldStart.toISOString();
      const oldEndIso = oldEnd.toISOString();
      const sessionId = r.sessionId;

      updateSession({
        id: sessionId,
        body: { startAt: newStartIso, endAt: newEndIso },
      });

      if (onPushUndo) {
        onPushUndo({
          label: 'Redimensionnement de séance',
          undo: () =>
            new Promise<void>((resolve) => {
              updateSession(
                { id: sessionId, body: { startAt: oldStartIso, endAt: oldEndIso } },
                { onSettled: () => resolve() },
              );
            }),
          redo: () =>
            new Promise<void>((resolve) => {
              updateSession(
                { id: sessionId, body: { startAt: newStartIso, endAt: newEndIso } },
                { onSettled: () => resolve() },
              );
            }),
        });
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [updateSession, onPushUndo]);

  // Lignes-guides d'une colonne : positions calées pendant resize ET déplacement.
  function columnGuideLines(dayIndex: number): { key: string; hour: number }[] {
    const lines: { key: string; hour: number }[] = [];
    if (resizePreview && resizePreview.dayIndex === dayIndex) {
      lines.push({ key: 'resize-start', hour: resizePreview.startHour });
      lines.push({ key: 'resize-end', hour: resizePreview.endHour });
    }
    if (drag && dropPreview && dropPreview.dayIndex === dayIndex) {
      const durationH = sessionDurationHours(drag.session);
      lines.push({ key: 'move-start', hour: dropPreview.startHour });
      lines.push({ key: 'move-end', hour: dropPreview.startHour + durationH });
    }
    return lines;
  }

  // Raccourcis copier/coller : Ctrl/Cmd+C copie la séance sélectionnée,
  // Ctrl/Cmd+V crée une copie au créneau situé sous le curseur.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'c') {
        // I.5 — capture le snapshot du Set sélectionné (préserve l'ordre par
        // index dans `sessions` pour stabilité).
        const selected = sessions.filter((s) => selectedIds.has(s.id));
        if (selected.length > 0) setCopiedSessions(selected);
        return;
      }
      if (key !== 'v') return;
      const pos = lastMousePosRef.current;
      if (copiedSessions.length === 0 || !pos) return;
      event.preventDefault();

      // L'anchor = 1ʳᵉ séance copiée (le plus tôt dans la semaine source).
      const anchor = copiedSessions[0]!;
      const anchorOldStart = new Date(anchor.startAt);
      const anchorOldDayIndex = anchorOldStart.getDay() === 0 ? 6 : anchorOldStart.getDay() - 1;

      const anchorNewHour = clamp(
        snap(DAY_START + pos.y / HOUR_HEIGHT),
        DAY_START,
        DAY_END - sessionDurationHours(anchor),
      );
      const anchorNewStart = addDays(weekStart, pos.dayIndex);
      anchorNewStart.setHours(
        Math.floor(anchorNewHour),
        Math.round((anchorNewHour % 1) * 60),
        0,
        0,
      );
      const deltaMs = anchorNewStart.getTime() - anchorOldStart.getTime();
      const deltaDay = pos.dayIndex - anchorOldDayIndex;

      copiedSessions.forEach((s) => {
        const oldStart = new Date(s.startAt);
        const durationMs = new Date(s.endAt).getTime() - oldStart.getTime();
        const newStart = new Date(oldStart.getTime() + deltaMs);
        if (deltaDay !== 0) newStart.setDate(newStart.getDate());
        const newEnd = new Date(newStart.getTime() + durationMs);
        const payload = buildCopyPayload(s, newStart.toISOString(), newEnd.toISOString());
        if (payload !== null) pasteSession(payload);
      });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sessions, selectedIds, copiedSessions, weekStart, pasteSession]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
        <p className="font-medium text-err">Impossible de charger le planning.</p>
        <p className="text-sm text-text-sec">{error.message}</p>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Réessayer
          </Button>
        ) : null}
      </div>
    );
  }

  const positioned = isLoading
    ? []
    : sessions.map((s) => positionSession(s)).filter((p): p is PositionedSession => p !== null);

  return (
    // Clic hors d'une séance → désélection (les cartes stoppent la propagation).
    // Calqué sur PLANIT-IA/rp/planning-canvas.jsx : rail heures 44px, en-tête
    // 42px non-capitalisé, scrollbars masquées (UX desktop pro).
    <div className="scrollbar-hide h-full overflow-auto bg-surface" onClick={clearSelection}>
      <div className="grid grid-cols-[44px_repeat(7,minmax(250px,2fr))]">
        {/* Header row : sticky corner + day labels (fond blanc, calqué PLANIT-IA) */}
        <div className="sticky left-0 top-0 z-30 flex h-[42px] items-center justify-center border-b border-r border-border-soft bg-surface text-text-faint">
          <BarChartIcon size={15} color="currentColor" />
        </div>
        {Array.from({ length: DAY_COUNT }, (_, dayIndex) => {
          const dayDate = addDays(weekStart, dayIndex);
          return (
            <div
              key={dayIndex}
              className="sticky top-0 z-20 flex h-[42px] flex-col justify-center border-b border-r border-border-soft bg-surface px-2.5 text-center"
            >
              <span className="truncate text-[11px] font-semibold leading-tight text-text">
                {format(dayDate, 'EEEE', { locale: fr })}
              </span>
              <span className="mt-px truncate text-[10px] leading-tight text-text-muted">
                {format(dayDate, 'd MMM', { locale: fr })}
              </span>
            </div>
          );
        })}

        {/* Body : sticky hour column + day columns with absolute-positioned sessions */}
        <div
          className="sticky left-0 z-10 border-r border-border-soft bg-surface"
          style={{ height: GRID_HEIGHT }}
        >
          {HOURS.filter((h) => (h - DAY_START) % 2 === 0).map((hour) => (
            // Label uniquement toutes les 2h, à droite avec léger padding,
            // pour matcher PLANIT-IA (heures impaires absentes du rail).
            <div
              key={hour}
              className="absolute pr-1.5 pt-0.5 text-[9px] font-medium tabular-nums text-text-muted"
              style={{ top: (hour - DAY_START) * HOUR_HEIGHT, right: 0 }}
            >
              {hour}h
            </div>
          ))}
        </div>

        {Array.from({ length: DAY_COUNT }, (_, dayIndex) => {
          const isDropColumn = dropPreview?.dayIndex === dayIndex;
          return (
            <div
              key={dayIndex}
              className={cn(
                'relative border-r border-border transition-colors',
                isDropColumn && 'bg-primary-50/60',
              )}
              style={{ height: GRID_HEIGHT }}
              onDragOver={(event) => handleDragOver(event, dayIndex)}
              onDrop={(event) => handleDrop(event, dayIndex)}
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const y = event.clientY - rect.top;
                lastMousePosRef.current = { dayIndex, y };

                // Drag-select actif (déclenché par double-clic) : étend la plage
                // tant qu'on reste sur le même jour. Snap interne 30 min. Si
                // changement de jour → annule (V2 spec I.2).
                if (activeDrag) {
                  if (activeDrag.dayIndex !== dayIndex) {
                    setActiveDrag(null);
                    return;
                  }
                  const cursorHour = hourFromY(y);
                  const endHour = clamp(
                    Math.max(cursorHour + SNAP_HOURS, activeDrag.anchorHour + SNAP_HOURS),
                    activeDrag.anchorHour + SNAP_HOURS,
                    DAY_END,
                  );
                  setActiveDrag({ ...activeDrag, endHour });
                  return;
                }

                // Si une sélection persistante (pending) existe déjà, on ne la
                // touche pas tant que l'utilisateur ne clique pas ailleurs.
                if (slotSelection?.kind === 'pending') return;

                // Hover passif : illumine le bloc 2h sous le curseur s'il est
                // libre. Aucun bouton + tant qu'on est en drag/resize de
                // séance existante.
                if (drag || resizePreview) {
                  if (slotSelection !== null) setSlotSelection(null);
                  return;
                }
                const cursorHour = hourFromY(y);
                const blockStart = blockStartFor(cursorHour);
                const blockEnd = Math.min(blockStart + HOVER_BLOCK_HOURS, DAY_END);
                if (!isRangeFree(dayIndex, blockStart, blockEnd)) {
                  if (slotSelection !== null) setSlotSelection(null);
                  return;
                }
                if (
                  slotSelection?.kind !== 'hover' ||
                  slotSelection.dayIndex !== dayIndex ||
                  slotSelection.startHour !== blockStart
                ) {
                  setSlotSelection({
                    kind: 'hover',
                    dayIndex,
                    startHour: blockStart,
                    endHour: blockEnd,
                  });
                }
              }}
              onMouseLeave={() => {
                // Le hover passif disparaît à la sortie ; la sélection pending
                // reste affichée (elle n'est annulée que par un clic explicite
                // ou Escape).
                setSlotSelection((prev) => (prev?.kind === 'hover' ? null : prev));
              }}
              onDoubleClick={(event) => {
                // Démarre un drag-select : double-clic sur le fond d'une colonne
                // (pas sur une SessionCard, qui stopPropagation). L'ancre du drag
                // = position curseur snappée à 30 min.
                if (event.target !== event.currentTarget) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const anchor = hourFromY(event.clientY - rect.top);
                setActiveDrag({ dayIndex, anchorHour: anchor, endHour: anchor + SNAP_HOURS });
                setSlotSelection(null);
              }}
              onMouseUp={(event) => {
                // Fin de drag-select : on passe la sélection en mode `pending`
                // et on attend un clic explicite (sur la zone) pour ouvrir la
                // modale. Aucune ouverture auto.
                if (!activeDrag || activeDrag.dayIndex !== dayIndex) return;
                event.stopPropagation();
                setSlotSelection({
                  kind: 'pending',
                  dayIndex,
                  startHour: activeDrag.anchorHour,
                  endHour: activeDrag.endHour,
                });
                setActiveDrag(null);
              }}
              onClick={(event) => {
                // Clic sur le fond d'une colonne (pas sur une SessionCard) :
                //  - s'il y a une sélection pending sur ce jour ET le clic est
                //    DANS la zone → ouvre la modale (commit de la sélection).
                //  - sinon, annule la sélection pending.
                if (event.target !== event.currentTarget) return;
                if (slotSelection?.kind === 'pending' && slotSelection.dayIndex === dayIndex) {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const clickHour = DAY_START + (event.clientY - rect.top) / HOUR_HEIGHT;
                  if (clickHour >= slotSelection.startHour && clickHour <= slotSelection.endHour) {
                    event.stopPropagation();
                    const slotDate = addDays(weekStart, dayIndex);
                    onCreateAtSlot?.({
                      date: slotDate,
                      startTime: fmtHour(slotSelection.startHour),
                      endTime: fmtHour(slotSelection.endHour),
                    });
                    setSlotSelection(null);
                    return;
                  }
                }
                // Clic ailleurs : on vide la sélection pending.
                if (slotSelection?.kind === 'pending') setSlotSelection(null);
              }}
            >
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

              {/* Aperçu de la position de dépôt pendant le drag */}
              {drag && dropPreview && dropPreview.dayIndex === dayIndex ? (
                <div
                  className="pointer-events-none absolute inset-x-1 rounded-[10px] border-2 border-dashed border-primary bg-primary-50"
                  style={{
                    top: (dropPreview.startHour - DAY_START) * HOUR_HEIGHT,
                    height: sessionDurationHours(drag.session) * HOUR_HEIGHT - 4,
                  }}
                  aria-hidden
                />
              ) : null}

              {/* Drag-select en cours (double-clic + drag) — preview pointillé */}
              {activeDrag && activeDrag.dayIndex === dayIndex ? (
                <div
                  className="pointer-events-none absolute inset-x-1 rounded-[10px] border-2 border-dashed border-accent bg-accent-100/70 transition-colors"
                  style={{
                    top: (activeDrag.anchorHour - DAY_START) * HOUR_HEIGHT,
                    height: (activeDrag.endHour - activeDrag.anchorHour) * HOUR_HEIGHT,
                  }}
                  aria-hidden
                />
              ) : null}

              {/* Sélection bloc 2h (hover passif ou pending) + bouton « + »
                  au centre. Le visuel adopte un style différent selon l'état :
                   - hover → halo doux primary-50, bordure dashed, bouton + petit
                   - pending → fond plus prononcé, bordure pleine accent, bouton + grand */}
              {!activeDrag && slotSelection && slotSelection.dayIndex === dayIndex ? (
                <SlotPreview
                  selection={slotSelection}
                  onCommit={(event) => {
                    event.stopPropagation();
                    const slotDate = addDays(weekStart, dayIndex);
                    onCreateAtSlot?.({
                      date: slotDate,
                      startTime: fmtHour(slotSelection.startHour),
                      endTime: fmtHour(slotSelection.endHour),
                    });
                    setSlotSelection(null);
                  }}
                />
              ) : null}

              {/* Lignes-guides en pointillés (resize + déplacement) avec l'heure */}
              {columnGuideLines(dayIndex).map((g) => (
                <GuideLine key={g.key} hour={g.hour} />
              ))}

              {isLoading ? (
                <SkeletonColumn dayIndex={dayIndex} />
              ) : (
                positioned
                  .filter((p) => p.dayIndex === dayIndex)
                  .map((p) => {
                    // Pendant un resize, la carte adopte les dimensions de l'aperçu.
                    const rp =
                      resizePreview && resizePreview.sessionId === p.session.id
                        ? resizePreview
                        : null;
                    const top = rp ? (rp.startHour - DAY_START) * HOUR_HEIGHT : p.top;
                    const height = rp
                      ? Math.max(28, (rp.endHour - rp.startHour) * HOUR_HEIGHT - 4)
                      : p.height;
                    const barColor = paletteForSessionV2(
                      p.session.module?.id ?? null,
                      p.session.type,
                    ).bar;
                    return (
                      <div
                        key={p.session.id}
                        className="group/wrap absolute inset-x-1"
                        style={{ top, height }}
                        onDragEnd={endDrag}
                      >
                        <SessionCard
                          session={p.session}
                          selected={selectedIds.has(p.session.id)}
                          isDragging={drag?.session.id === p.session.id}
                          onSelect={handleSelect}
                          onOpen={onSessionOpen}
                          onDragStart={(s, event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setDrag({ session: s, grabOffsetY: event.clientY - rect.top });
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                        />
                        <ResizeHandle
                          edge="top"
                          color={barColor}
                          onMouseDown={(event) => startResize(p.session, 'top', dayIndex, event)}
                        />
                        <ResizeHandle
                          edge="bottom"
                          color={barColor}
                          onMouseDown={(event) => startResize(p.session, 'bottom', dayIndex, event)}
                        />
                      </div>
                    );
                  })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonColumn({ dayIndex }: { dayIndex: number }) {
  // Show a couple of skeleton blocks per column on alternating offsets.
  const offsets = dayIndex % 2 === 0 ? [1, 5] : [3];
  return (
    <>
      {offsets.map((hourOffset) => (
        <div
          key={hourOffset}
          className="absolute inset-x-1 animate-pulse rounded-md bg-border-soft"
          style={{ top: hourOffset * HOUR_HEIGHT, height: HOUR_HEIGHT * 1.5 }}
          aria-hidden
        />
      ))}
    </>
  );
}

// Ligne-guide horizontale en pointillés + libellé d'heure, affichée pendant
// un redimensionnement ou un déplacement (prévisualisation du créneau cible).
function GuideLine({ hour }: { hour: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top: (hour - DAY_START) * HOUR_HEIGHT }}
      aria-hidden
    >
      <div className="border-t-[1.5px] border-dashed border-primary opacity-80" />
      <span className="absolute -top-2 left-1 rounded bg-surface px-1 text-[9px] font-bold tabular-nums text-primary">
        {fmtHour(hour)}
      </span>
    </div>
  );
}

// Aperçu d'un bloc créneau (hover ou pending) avec bouton « + » au centre.
// Distinction UX :
//  - `hover` (transient) : halo discret, bordure dashed, bouton + compact.
//    Suggère que la zone est cliquable sans bloquer la grille.
//  - `pending` (figé après double-clic+drag) : bordure pleine et bouton +
//    plus présent. Indique clairement qu'un clic dans la zone validera.
function SlotPreview({
  selection,
  onCommit,
}: {
  selection: {
    kind: 'hover' | 'pending';
    dayIndex: number;
    startHour: number;
    endHour: number;
  };
  onCommit: (event: React.MouseEvent) => void;
}) {
  const top = (selection.startHour - DAY_START) * HOUR_HEIGHT;
  const height = (selection.endHour - selection.startHour) * HOUR_HEIGHT;
  const isPending = selection.kind === 'pending';
  return (
    <div
      // pointerEvents=none pour `hover` (laisse la grille gérer le mouseMove) ;
      // pointerEvents=auto pour `pending` (le bouton interne capture le clic).
      className={cn(
        'absolute inset-x-1 rounded-[10px] transition-all duration-150',
        isPending
          ? 'pointer-events-none border-2 border-accent bg-accent-100/50 shadow-[0_2px_8px_rgba(232,98,10,0.18)]'
          : 'pointer-events-none border border-dashed border-primary-200 bg-primary-50/50',
      )}
      style={{ top, height }}
      aria-hidden
    >
      <button
        type="button"
        aria-label={`Créer une séance de ${fmtHour(selection.startHour)} à ${fmtHour(selection.endHour)}`}
        onClick={onCommit}
        className={cn(
          'pointer-events-auto absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-white transition-all hover:scale-110',
          isPending
            ? 'h-12 w-12 bg-accent shadow-[0_6px_20px_rgba(232,98,10,0.35)]'
            : 'h-9 w-9 bg-accent/90 opacity-90 hover:opacity-100',
        )}
      >
        <svg
          width={isPending ? '22' : '16'}
          height={isPending ? '22' : '16'}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {/* Étiquette horaire en haut du bloc pour confirmer la plage choisie. */}
      <span
        className={cn(
          'absolute left-2 top-1.5 rounded-full bg-white/90 px-1.5 py-px text-[10px] font-semibold tabular-nums text-accent-800',
          isPending ? 'opacity-100' : 'opacity-80',
        )}
      >
        {fmtHour(selection.startHour)} – {fmtHour(selection.endHour)}
      </span>
    </div>
  );
}

// Poignée de redimensionnement (bord haut ou bas d'une séance).
function ResizeHandle({
  edge,
  color,
  onMouseDown,
}: {
  edge: 'top' | 'bottom';
  color: string;
  onMouseDown: (event: React.MouseEvent) => void;
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
