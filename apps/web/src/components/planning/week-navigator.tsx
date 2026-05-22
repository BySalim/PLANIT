'use client';

import { format, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@planit/ui';
import { Button } from '@/components/ui/button';
import { addWeeks, getCurrentWeekStart, getWeekEnd, getWeekNumber } from '@/lib/week';
import { cn } from '@/lib/utils';

interface WeekNavigatorProps {
  weekStart: Date;
  onChange: (next: Date) => void;
}

export function WeekNavigator({ weekStart, onChange }: WeekNavigatorProps) {
  const weekEnd = getWeekEnd(weekStart);
  const weekNumber = getWeekNumber(weekStart);
  const currentWeekStart = getCurrentWeekStart();
  const isCurrent = isSameWeek(weekStart, currentWeekStart, { weekStartsOn: 1 });

  const startLabel = format(weekStart, 'd MMM', { locale: fr });
  const endLabel = format(weekEnd, 'd MMM yyyy', { locale: fr });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(currentWeekStart)}
        disabled={isCurrent}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium text-text',
          isCurrent ? 'cursor-default opacity-90' : 'hover:border-primary hover:text-primary',
        )}
        aria-label="Revenir à cette semaine"
      >
        <CalendarIcon size={14} color="currentColor" />
        Cette semaine
      </button>

      <div className="flex h-9 items-center overflow-hidden rounded-lg border border-border bg-surface">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Semaine précédente"
          onClick={() => onChange(addWeeks(weekStart, -1))}
          className="h-9 rounded-none border-r border-border px-2"
        >
          <ChevronLeftIcon size={16} color="currentColor" />
        </Button>
        <div className="flex flex-col items-center justify-center px-4 leading-tight">
          <span className="text-[13px] font-semibold text-text">
            {startLabel} – {endLabel}
          </span>
          <span className="text-[10.5px] uppercase tracking-wider text-text-muted">
            S{weekNumber}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Semaine suivante"
          onClick={() => onChange(addWeeks(weekStart, 1))}
          className="h-9 rounded-none border-l border-border px-2"
        >
          <ChevronRightIcon size={16} color="currentColor" />
        </Button>
      </div>
    </div>
  );
}
