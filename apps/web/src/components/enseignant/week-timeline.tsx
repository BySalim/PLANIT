'use client';

import { useEffect, useRef } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SessionDto, SessionType } from '@planit/contracts';
import { MapPinIcon, UserSmallIcon } from '@planit/ui';
import { now as nowDakar } from '@planit/utils/date';
import { categoryForType, paletteForSession } from '@/lib/module-palette';
import { cn } from '@/lib/utils';

const HOUR_H = 54;
const START_H = 8;
const END_H = 21;
const TOTAL_H = END_H - START_H;
const TIME_COL_W = 32;
const COL_W = 168;

const DAY_INITIALS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function timeToY(date: Date): number {
  return (date.getHours() - START_H + date.getMinutes() / 60) * HOUR_H;
}

type SlotStatus = 'past' | 'ongoing' | 'upcoming';

function slotStatus(start: Date, end: Date, now: Date): SlotStatus {
  if (now >= end) return 'past';
  if (now >= start) return 'ongoing';
  return 'upcoming';
}

function durLabel(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

// ── TypeBadge — conforme PLANIT-Design (fond transparent, catégorie) ──────────
const CATEGORY_LABEL: Record<string, string> = {
  cours: 'Cours',
  evaluation: 'Éval.',
  evenement: 'Évén.',
};

function TypeBadge({ type, compact }: { readonly type: SessionType; readonly compact?: boolean }) {
  const cat = categoryForType(type);
  const label = CATEGORY_LABEL[cat] ?? 'Cours';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: compact ? 15 : 20,
        padding: compact ? '0 4px' : '0 7px',
        borderRadius: compact ? 3 : 4,
        background: 'transparent',
        color: '#3A2E22',
        fontSize: compact ? 8.5 : 10.5,
        fontWeight: 700,
        letterSpacing: compact ? 0.35 : 0.5,
        textTransform: 'uppercase',
        fontFamily: 'Inter, system-ui',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

// ── PlanningSessionBlock (densité compact — vue semaine) ──────────────────────
// variant 'teacher' : affiche classe.code · 'student' : affiche teacher.fullName
interface BlockProps {
  readonly session: SessionDto;
  readonly top: number;
  readonly height: number;
  readonly now: Date;
  readonly variant: 'teacher' | 'student';
  readonly onTap?: (session: SessionDto) => void;
}

function PlanningSessionBlock({ session, top, height, now, variant, onTap }: BlockProps) {
  const palette = paletteForSession(session.module.id, session.type);
  const start = new Date(session.startAt);
  const end = new Date(session.endAt);
  const status = slotStatus(start, end, now);

  const dotColor = status === 'ongoing' ? '#E8620A' : status === 'past' ? '#A8A29E' : '#16A34A';

  // Seuils identiques au design de référence (density compact)
  const showMeta = height > 36; // classe ou enseignant
  const showTime = height > 48;
  const showLocation = height > 62;
  const twoLineName = height > 72;

  // Ligne meta : enseignant → classe · étudiant → nom du prof
  const metaLine = variant === 'teacher' ? session.classe.code : session.teacher.fullName;

  return (
    <button
      type="button"
      onClick={onTap ? () => onTap(session) : undefined}
      className="absolute overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        top,
        height,
        left: 3,
        right: 3,
        borderRadius: 8,
        background: palette.bg,
        borderLeft: `3px solid ${palette.bar}`,
        boxShadow: '0 1px 2px rgba(28,25,23,0.05)',
        display: 'flex',
        gap: 8,
        padding: '5px 8px 5px 8px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        textAlign: 'left',
      }}
      aria-label={`${session.module.name} ${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`}
    >
      {/* Colonne gauche — contenu */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Nom du module — nom complet (équivalent mod.short || mod.name dans le design) */}
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 600,
            fontSize: 10.5,
            color: palette.text,
            lineHeight: 1.25,
            letterSpacing: -0.1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: twoLineName ? 2 : 1,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {session.module.name}
        </span>

        {/* Meta — classe (enseignant, sans icône) ou nom prof avec icône (étudiant) */}
        {showMeta ? (
          variant === 'student' ? (
            <span
              style={{
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 9.5,
                color: palette.text,
                opacity: 0.78,
                fontWeight: 500,
                fontFamily: 'Inter, system-ui',
                lineHeight: 1.3,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              <UserSmallIcon size={10} color={palette.text} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{metaLine}</span>
            </span>
          ) : (
            <span
              style={{
                marginTop: 2,
                fontSize: 9.5,
                color: palette.text,
                opacity: 0.78,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
            >
              {metaLine}
            </span>
          )
        ) : null}

        {/* Horaire + durée */}
        {showTime ? (
          <span
            style={{
              marginTop: 2,
              fontSize: 9.5,
              color: palette.text,
              opacity: 0.85,
              fontFamily: 'Inter, system-ui',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.3,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {format(start, 'HH:mm')}
            {' – '}
            {format(end, 'HH:mm')}
            <span style={{ opacity: 0.35, margin: '0 3px' }}>·</span>
            <span style={{ fontWeight: 600 }}>{durLabel(start, end)}</span>
          </span>
        ) : null}

        {/* Salle — avec icône mapPin */}
        {showLocation ? (
          <span
            style={{
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 9.5,
              color: palette.text,
              opacity: 0.72,
              fontFamily: 'Inter, system-ui',
              lineHeight: 1.3,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            <MapPinIcon size={10} color={palette.text} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session.salle.name}
            </span>
          </span>
        ) : null}
      </div>

      {/* Colonne droite — dot statut (haut) + TypeBadge catégorie (bas) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexShrink: 0,
          minHeight: 22,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
            animation: status === 'ongoing' ? 'planitPulse 1.6s ease-in-out infinite' : 'none',
            boxShadow: status === 'ongoing' ? '0 0 0 2px rgba(232,98,10,0.28)' : 'none',
          }}
        />
        <TypeBadge type={session.type} compact />
      </div>
    </button>
  );
}

// ── WeekDayHeader ─────────────────────────────────────────────────────────────
// En-tête jours indépendant — à placer dans le même bloc sticky que la toolbar
// (pattern PLANIT-Design : la toolbar + l'en-tête jours sticky ensemble).
export interface WeekDayHeaderProps {
  readonly weekStart: Date;
  readonly selectedDate: Date;
  readonly today: Date;
  /** Décalage horizontal en pixels — synchronisé avec le scroll de la grille. */
  readonly scrollX: number;
  readonly onDaySelect?: (date: Date) => void;
}

export function WeekDayHeader({
  weekStart,
  selectedDate,
  today,
  scrollX,
  onDaySelect,
}: WeekDayHeaderProps) {
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="flex border-b border-border bg-surface">
      <div className="flex-shrink-0" style={{ width: TIME_COL_W }} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className="flex"
          style={{
            width: 7 * COL_W,
            transform: `translateX(-${scrollX}px)`,
            willChange: 'transform',
          }}
        >
          {weekDates.map((d, i) => {
            const isToday = isSameDay(d, today);
            const isSel = isSameDay(d, selectedDate);
            return (
              <button
                key={i}
                type="button"
                onClick={onDaySelect ? () => onDaySelect(d) : undefined}
                className="flex flex-shrink-0 flex-col items-center"
                style={{ width: COL_W, padding: '5px 0' }}
                aria-label={format(d, 'EEEE d MMMM', { locale: fr })}
                aria-pressed={isSel}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isToday ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    letterSpacing: '0.3px',
                    fontFamily: 'Inter, system-ui',
                    lineHeight: 1,
                  }}
                >
                  {DAY_INITIALS[i]}
                </span>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                    background: isSel
                      ? isToday
                        ? 'var(--color-accent)'
                        : 'var(--color-primary)'
                      : isToday
                        ? 'var(--color-accent-100)'
                        : 'transparent',
                    border: isToday && !isSel ? '1.5px solid var(--color-accent)' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Poppins, system-ui',
                      fontSize: 11,
                      fontWeight: isToday || isSel ? 700 : 500,
                      color: isSel ? '#FFF' : isToday ? 'var(--color-accent)' : 'var(--color-text)',
                      lineHeight: 1,
                    }}
                  >
                    {d.getDate()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── WeekTimeline ──────────────────────────────────────────────────────────────
// Grille semaine (axe horaire + colonnes jours) — sans en-tête (utiliser
// <WeekDayHeader/> séparément pour qu'il puisse être placé dans la sticky toolbar).
export interface WeekTimelineProps {
  readonly weekStart: Date;
  readonly selectedDate: Date;
  readonly sessions: readonly SessionDto[];
  readonly now?: Date;
  /** 'teacher' (défaut) : affiche classe · 'student' : affiche nom du prof */
  readonly variant?: 'teacher' | 'student';
  readonly onSessionTap?: (session: SessionDto) => void;
  /** Callback de scroll horizontal — sync avec <WeekDayHeader scrollX={...}/>. */
  readonly onScrollXChange?: (x: number) => void;
}

export function WeekTimeline({
  weekStart,
  selectedDate: _selectedDate,
  sessions,
  now = nowDakar(),
  variant = 'teacher',
  onSessionTap,
  onScrollXChange,
}: WeekTimelineProps) {
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const totalHeight = TOTAL_H * HOUR_H;
  const labelHours = Array.from(
    { length: Math.ceil(TOTAL_H / 2) + 1 },
    (_, i) => START_H + i * 2,
  ).filter((h) => h < END_H);
  const hasToday = weekDates.some((d) => isSameDay(d, now));
  const nowY = timeToY(now);

  // Scroll horizontal de la grille — reset à 0 au changement de semaine.
  const gridRef = useRef<HTMLDivElement>(null);
  const weekStartTs = weekStart.getTime();
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollLeft = 0;
    onScrollXChange?.(0);
  }, [weekStartTs, onScrollXChange]);

  return (
    <div className="flex flex-col">
      {/* ── Grille ── */}
      <div className="flex">
        {/* Axe horaire */}
        <div
          className="relative flex-shrink-0 bg-surface"
          style={{ width: TIME_COL_W, height: totalHeight }}
        >
          {labelHours.map((h) => {
            const isMajor = (h - START_H) % 4 === 0;
            return (
              <span
                key={h}
                className={cn(
                  'absolute right-1 pt-0.5 tabular-nums',
                  isMajor ? 'text-[9px] text-text-muted' : 'text-[8px] text-text-faint',
                )}
                style={{ top: (h - START_H) * HOUR_H }}
              >
                {h}h
              </span>
            );
          })}
          {hasToday ? (
            <span
              className="absolute right-0.5 flex h-4 items-center rounded bg-accent px-1 text-[8.5px] font-bold tabular-nums text-white shadow-[0_2px_5px_rgba(232,98,10,0.4)]"
              style={{ top: nowY - 8 }}
            >
              {format(now, 'HH:mm', { locale: fr })}
            </span>
          ) : null}
        </div>

        {/* Colonnes jours */}
        <div
          ref={gridRef}
          className="flex-1 overflow-x-auto"
          onScroll={(e) => onScrollXChange?.(e.currentTarget.scrollLeft)}
        >
          <div className="flex" style={{ width: 7 * COL_W }}>
            {weekDates.map((date, di) => {
              const isToday = isSameDay(date, now);
              const daySessions = sessions.filter((s) => isSameDay(new Date(s.startAt), date));
              return (
                <div
                  key={di}
                  className="relative flex-shrink-0"
                  style={{
                    width: COL_W,
                    height: totalHeight,
                    background: isToday ? 'rgba(107,45,14,0.025)' : 'transparent',
                  }}
                >
                  {/* Lignes majeures (toutes les 4h) */}
                  {Array.from({ length: Math.floor(TOTAL_H / 4) }, (_, i) => i + 1).map((i) => (
                    <span
                      key={`maj-${i}`}
                      aria-hidden
                      className="absolute inset-x-0 border-t border-border"
                      style={{ top: i * 4 * HOUR_H }}
                    />
                  ))}
                  {/* Lignes mineures (toutes les 2h) */}
                  {Array.from({ length: Math.ceil(TOTAL_H / 4) }, (_, i) => i).map((i) => {
                    const y = (i * 4 + 2) * HOUR_H;
                    if (y >= totalHeight) return null;
                    return (
                      <span
                        key={`min-${i}`}
                        aria-hidden
                        className="absolute inset-x-0 border-t border-border-soft opacity-60"
                        style={{ top: y }}
                      />
                    );
                  })}
                  {/* Ligne heure courante */}
                  {isToday ? (
                    <>
                      <span
                        aria-hidden
                        className="absolute inset-x-0 z-[4] h-[1.5px] bg-accent shadow-[0_0_6px_rgba(232,98,10,0.55)]"
                        style={{ top: nowY - 0.75 }}
                      />
                      <span
                        aria-hidden
                        className="absolute z-[5] size-[9px] rounded-full bg-accent shadow-[0_0_0_2px_var(--color-surface),0_1px_3px_rgba(232,98,10,0.5)]"
                        style={{ top: nowY - 4.5, left: -4.5 }}
                      />
                    </>
                  ) : null}
                  {/* Séances */}
                  {daySessions.map((session) => {
                    const start = new Date(session.startAt);
                    const end = new Date(session.endAt);
                    const top = timeToY(start);
                    const height = Math.max(timeToY(end) - top - 2, 22);
                    return (
                      <PlanningSessionBlock
                        key={session.id}
                        session={session}
                        top={top + 1}
                        height={height}
                        now={now}
                        variant={variant}
                        {...(onSessionTap !== undefined ? { onTap: onSessionTap } : {})}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
