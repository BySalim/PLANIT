'use client';

import type { ReactNode } from 'react';
import { format, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@planit/ui';
import { addWeeks, getCurrentWeekStart, getWeekEnd, getWeekNumber } from '@/lib/week';
import { cn } from '@/lib/utils';

interface WeekNavigatorProps {
  weekStart: Date;
  onChange: (next: Date) => void;
}

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

export function WeekNavigator({ weekStart, onChange }: WeekNavigatorProps) {
  const weekEnd = getWeekEnd(weekStart);
  const weekNumber = getWeekNumber(weekStart);
  const currentWeekStart = getCurrentWeekStart();
  const isCurrent = isSameWeek(weekStart, currentWeekStart, { weekStartsOn: 1 });

  const startLabel = format(weekStart, 'd MMM', { locale: fr });
  const endLabel = format(weekEnd, 'd MMM yyyy', { locale: fr });

  return (
    <div className="flex flex-shrink-0 items-center gap-1.5">
      <NavArrow label="Semaine précédente" onClick={() => onChange(addWeeks(weekStart, -1))}>
        <ChevronLeftIcon size={16} color="currentColor" />
      </NavArrow>

      <button
        type="button"
        onClick={() => onChange(currentWeekStart)}
        disabled={isCurrent}
        aria-label="Revenir à cette semaine"
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition-colors',
          isCurrent
            ? 'cursor-default border-primary bg-primary-50 text-primary'
            : 'border-border-soft bg-surface text-text hover:border-primary hover:text-primary',
        )}
      >
        <span>Cette semaine</span>
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
    </div>
  );
}
