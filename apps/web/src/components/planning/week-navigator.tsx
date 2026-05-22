import { ChevronLeftIcon, ChevronRightIcon } from '@planit/ui';
import { Button } from '@/components/ui/button';
import { addWeeks, formatWeekRange, getCurrentWeekStart } from '@/lib/week';

interface WeekNavigatorProps {
  weekStart: Date;
  onChange: (next: Date) => void;
}

export function WeekNavigator({ weekStart, onChange }: WeekNavigatorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Semaine précédente"
        onClick={() => onChange(addWeeks(weekStart, -1))}
      >
        <ChevronLeftIcon size={16} />
      </Button>
      <div className="min-w-[220px] text-center text-sm font-medium text-text">
        {formatWeekRange(weekStart)}
      </div>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Semaine suivante"
        onClick={() => onChange(addWeeks(weekStart, 1))}
      >
        <ChevronRightIcon size={16} />
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onChange(getCurrentWeekStart())}>
        Aujourd&apos;hui
      </Button>
    </div>
  );
}
