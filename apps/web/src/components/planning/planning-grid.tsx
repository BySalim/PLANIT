'use client';

import { useState } from 'react';
import { addDays, differenceInMinutes, format, getHours, getMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChartIcon } from '@planit/ui';
import type { SessionDto } from '@planit/contracts';
import { Button } from '@/components/ui/button';
import { useUpdateSessionMutation } from '@/lib/mutations';
import { cn } from '@/lib/utils';
import { SessionCard } from './session-card';

interface PlanningGridProps {
  weekStart: Date;
  sessions: SessionDto[];
  isLoading: boolean;
  error: Error | null;
  /** Ouverture du détail d'une séance (double-clic). */
  onSessionOpen?: ((session: SessionDto) => void) | undefined;
  onRetry?: (() => void) | undefined;
}

const DAY_START = 8;
const DAY_END = 20;
const HOUR_HEIGHT = 78; // px/heure — calqué sur PLANIT-IA/rp (HOUR_H)
const DAY_COUNT = 6; // Lundi → Samedi
const SNAP_HOURS = 0.5; // pas de calage du drag = 30 min
const GRID_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT;
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

interface PositionedSession {
  session: SessionDto;
  dayIndex: number;
  top: number;
  height: number;
}

interface DragState {
  session: SessionDto;
  /** Décalage vertical (px) entre le curseur et le haut de la carte saisie. */
  grabOffsetY: number;
}

interface DropPreview {
  dayIndex: number;
  startHour: number;
}

function sessionDurationHours(session: SessionDto): number {
  return differenceInMinutes(new Date(session.endAt), new Date(session.startAt)) / 60;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function snap(hour: number): number {
  return Math.round(hour / SNAP_HOURS) * SNAP_HOURS;
}

function positionSession(session: SessionDto): PositionedSession | null {
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

export function PlanningGrid({
  weekStart,
  sessions,
  isLoading,
  error,
  onSessionOpen,
  onRetry,
}: PlanningGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const updateSession = useUpdateSessionMutation();

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
    const { session } = drag;
    const oldStart = new Date(session.startAt);
    const durationMs = new Date(session.endAt).getTime() - oldStart.getTime();

    const newStart = addDays(weekStart, dayIndex);
    newStart.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    setDrag(null);
    setDropPreview(null);
    // Pas de mutation si la séance est relâchée exactement à sa place initiale.
    if (newStart.getTime() === oldStart.getTime()) return;

    updateSession.mutate({
      id: session.id,
      body: { startAt: newStart.toISOString(), endAt: newEnd.toISOString() },
    });
  }

  function endDrag() {
    setDrag(null);
    setDropPreview(null);
  }

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
    <div className="h-full overflow-auto bg-surface">
      <div className="grid min-w-[964px] grid-cols-[64px_repeat(6,minmax(0,1fr))]">
        {/* Header row : sticky corner + day labels (fond blanc, calqué PLANIT-IA) */}
        <div className="sticky left-0 top-0 z-30 flex items-center justify-center border-b border-r border-border bg-surface text-text-faint">
          <BarChartIcon size={15} color="currentColor" />
        </div>
        {Array.from({ length: DAY_COUNT }, (_, dayIndex) => {
          const dayDate = addDays(weekStart, dayIndex);
          return (
            <div
              key={dayIndex}
              className="sticky top-0 z-20 border-b border-r border-border bg-surface px-3 py-2.5 text-center"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-text-sec">
                {format(dayDate, 'EEEE', { locale: fr })}
              </div>
              <div className="text-[11px] text-text-muted">
                {format(dayDate, 'd MMM', { locale: fr })}
              </div>
            </div>
          );
        })}

        {/* Body : sticky hour column + day columns with absolute-positioned sessions */}
        <div
          className="sticky left-0 z-10 border-r border-border bg-surface"
          style={{ height: GRID_HEIGHT }}
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-1 -translate-y-1/2 text-[10px] font-medium text-text-muted"
              style={{ top: (hour - DAY_START) * HOUR_HEIGHT }}
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

              {isLoading ? (
                <SkeletonColumn dayIndex={dayIndex} />
              ) : (
                positioned
                  .filter((p) => p.dayIndex === dayIndex)
                  .map((p) => (
                    <div
                      key={p.session.id}
                      className="absolute inset-x-1"
                      style={{ top: p.top, height: p.height }}
                      onDragEnd={endDrag}
                    >
                      <SessionCard
                        session={p.session}
                        selected={selectedId === p.session.id}
                        isDragging={drag?.session.id === p.session.id}
                        onSelect={(s) => setSelectedId(s.id)}
                        onOpen={onSessionOpen}
                        onDragStart={(s, event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setDrag({ session: s, grabOffsetY: event.clientY - rect.top });
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                      />
                    </div>
                  ))
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
