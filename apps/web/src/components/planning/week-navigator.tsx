'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  addYears,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameWeek,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@planit/ui';
import { addWeeks, getCurrentWeekStart, getWeekEnd, getWeekNumber } from '@/lib/week';
import { cn } from '@/lib/utils';

interface WeekNavigatorProps {
  weekStart: Date;
  onChange: (next: Date) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Label relatif à la semaine courante (Africa/Dakar) :
 *  -  0 → « Cette semaine »
 *  -  1 → « Semaine prochaine »
 *  - -1 → « Semaine précédente »
 *  - >1 → « Dans N semaines »
 *  - <-1 → « Il y a N semaines »
 */
function relativeWeekLabel(weekStart: Date, currentWeekStart: Date): string {
  const delta = differenceInCalendarWeeks(weekStart, currentWeekStart, { weekStartsOn: 1 });
  if (delta === 0) return 'Cette semaine';
  if (delta === 1) return 'Semaine prochaine';
  if (delta === -1) return 'Semaine précédente';
  if (delta > 1) return `Dans ${delta} semaines`;
  return `Il y a ${Math.abs(delta)} semaines`;
}

/** Capitale française : « Janvier » à partir de « janvier ». */
function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Boutons utilitaires ───────────────────────────────────────────────

function NavArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border-soft bg-surface text-text-sec transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </button>
  );
}

// ── Composant principal ───────────────────────────────────────────────

export function WeekNavigator({ weekStart, onChange }: WeekNavigatorProps) {
  const weekEnd = getWeekEnd(weekStart);
  const weekNumber = getWeekNumber(weekStart);
  const currentWeekStart = getCurrentWeekStart();
  const isCurrent = isSameWeek(weekStart, currentWeekStart, { weekStartsOn: 1 });

  const startLabel = format(weekStart, 'd MMM', { locale: fr });
  const endLabel = format(weekEnd, 'd MMM yyyy', { locale: fr });
  const label = relativeWeekLabel(weekStart, currentWeekStart);

  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-shrink-0 items-center gap-1.5">
      <NavArrow label="Semaine précédente" onClick={() => onChange(addWeeks(weekStart, -1))}>
        <ChevronLeftIcon size={16} color="currentColor" />
      </NavArrow>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Ouvrir le sélecteur de semaine"
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition-colors',
          // 3 états visuels :
          //  - open : violet tertiaire « actif » (focus modal)
          //  - isCurrent (≠ open) : accent orange — signal contextuel
          //    « tu regardes la semaine en cours »
          //  - autres semaines : neutre
          open
            ? 'border-primary bg-primary-50 text-primary'
            : isCurrent
              ? 'border-accent bg-accent-100 text-accent-800 hover:bg-accent hover:text-white'
              : 'border-border-soft bg-surface text-text hover:border-primary hover:text-primary',
        )}
      >
        <span>{label}</span>
        <CalendarIcon size={13} color="currentColor" />
      </button>

      <NavArrow label="Semaine suivante" onClick={() => onChange(addWeeks(weekStart, 1))}>
        <ChevronRightIcon size={16} color="currentColor" />
      </NavArrow>

      <div className="flex flex-col pl-1 leading-tight">
        <span className="text-[12.5px] font-semibold text-text">
          {startLabel} – {endLabel}
        </span>
        <span className="text-[10.5px] uppercase tracking-wider text-text-muted">
          S{weekNumber}
        </span>
      </div>

      {open ? (
        <WeekPickerYearOverlay
          selectedWeekStart={weekStart}
          currentWeekStart={currentWeekStart}
          onPickWeek={(monday) => {
            onChange(monday);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

// ── Overlay calendrier annuel (12 mini-mois) ──────────────────────────

interface OverlayProps {
  selectedWeekStart: Date;
  currentWeekStart: Date;
  onPickWeek: (monday: Date) => void;
  onClose: () => void;
}

function WeekPickerYearOverlay({
  selectedWeekStart,
  currentWeekStart,
  onPickWeek,
  onClose,
}: OverlayProps) {
  // Année affichée — initialisée sur l'année de la semaine sélectionnée
  // pour que l'utilisateur retrouve son contexte au mount.
  const [year, setYear] = useState<number>(() => selectedWeekStart.getFullYear());
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc → close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 12 mois de l'année courante (Janvier=0 → Décembre=11)
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  // Lock scroll du body pendant l'overlay (évite l'effet « la page bouge
  // derrière le modal »). Restauré au démontage.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Focus le dialog au mount pour qu'Escape soit capté même sans clic.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        // Clic sur le backdrop (pas sur le dialog interne) → close.
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sélecteur de semaine — calendrier annuel"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl outline-none"
      >
        {/* Header : nav année + raccourci aujourd'hui + fermer */}
        <header className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border-soft px-5 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Année précédente"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-soft text-text-sec transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeftIcon size={15} color="currentColor" />
            </button>
            <span className="min-w-[80px] text-center font-display text-[20px] font-bold tabular-nums text-text">
              {year}
            </span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Année suivante"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-soft text-text-sec transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronRightIcon size={15} color="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => setYear(new Date().getFullYear())}
              className="ml-1 inline-flex h-8 items-center rounded-lg border border-border-soft bg-surface px-2.5 text-[12px] font-medium text-text-sec transition-colors hover:border-primary hover:text-primary"
            >
              Année en cours
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPickWeek(currentWeekStart)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent bg-accent-100 px-3 text-[12px] font-semibold text-accent-800 transition-colors hover:bg-accent hover:text-white"
            >
              <CalendarIcon size={13} color="currentColor" />
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le calendrier"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg hover:text-text"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Grille 12 mois — responsive : 4 col xl, 3 col md, 2 col sm, 1 col xs */}
        <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-5 overflow-auto px-5 py-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {months.map((month) => (
            <MiniMonth
              key={month.toISOString()}
              month={month}
              selectedWeekStart={selectedWeekStart}
              currentWeekStart={currentWeekStart}
              onPickWeek={onPickWeek}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mini-mois ─────────────────────────────────────────────────────────

const WEEK_DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

interface MiniMonthProps {
  month: Date;
  selectedWeekStart: Date;
  currentWeekStart: Date;
  onPickWeek: (monday: Date) => void;
}

function MiniMonth({ month, selectedWeekStart, currentWeekStart, onPickWeek }: MiniMonthProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const weeks = eachWeekOfInterval({ start: gridStart, end: gridEnd }, { weekStartsOn: 1 });
  const monthTitle = capitalize(format(month, 'MMMM', { locale: fr }));

  return (
    <div className="flex flex-col">
      <h3 className="mb-1.5 text-center text-[12.5px] font-semibold text-text">{monthTitle}</h3>
      <div className="grid grid-cols-7 gap-y-px text-center text-[9px] font-semibold uppercase tracking-wider text-text-muted">
        {WEEK_DAY_LABELS.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="mt-0.5 flex flex-col gap-px">
        {weeks.map((monday) => (
          <MiniWeekRow
            key={monday.toISOString()}
            monday={monday}
            month={month}
            isSelected={isSameWeek(monday, selectedWeekStart, { weekStartsOn: 1 })}
            isCurrent={isSameWeek(monday, currentWeekStart, { weekStartsOn: 1 })}
            onPick={() => onPickWeek(monday)}
          />
        ))}
      </div>
    </div>
  );
}

interface MiniWeekRowProps {
  monday: Date;
  month: Date;
  isSelected: boolean;
  isCurrent: boolean;
  onPick: () => void;
}

function MiniWeekRow({ monday, month, isSelected, isCurrent, onPick }: MiniWeekRowProps) {
  const days = eachDayOfInterval({
    start: monday,
    end: endOfWeek(monday, { weekStartsOn: 1 }),
  });
  const weekNum = getWeekNumber(monday);

  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`Semaine ${weekNum} de ${format(monday, 'MMMM yyyy', { locale: fr })}`}
      title={`Semaine ${weekNum} — du ${format(monday, 'd MMM', { locale: fr })}`}
      className={cn(
        'grid grid-cols-7 rounded-md transition-colors',
        // Hover : highlight de toute la ligne (signal « clic = semaine »)
        !isSelected && 'hover:bg-bg-warm/70',
        // Semaine sélectionnée → bande primary marquée
        isSelected && 'bg-primary-50 ring-1 ring-primary',
        // Semaine en cours réelle (≠ sélection) → marquage subtil accent
        !isSelected && isCurrent && 'bg-accent-50/70',
      )}
    >
      {days.map((day) => {
        const inMonth = isSameMonth(day, month);
        const today = isToday(day);
        return (
          <span
            key={day.toISOString()}
            className={cn(
              'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] tabular-nums',
              today ? 'bg-accent font-bold text-white' : inMonth ? 'text-text' : 'text-text-faint',
            )}
          >
            {day.getDate()}
          </span>
        );
      })}
    </button>
  );
}
