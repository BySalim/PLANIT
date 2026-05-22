import { InfoIcon } from '@planit/ui';
import { getWeekHolidays } from '@/lib/holidays';

interface HolidayBannerProps {
  weekStart: Date;
}

export function HolidayBanner({ weekStart }: HolidayBannerProps) {
  const holidays = getWeekHolidays(weekStart);
  if (holidays.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warn bg-warn px-4 py-2.5 text-[12.5px] text-warn-text">
      <span className="flex flex-shrink-0 items-center gap-2 font-semibold">
        <InfoIcon size={14} color="currentColor" />
        Jour(s) fermé(s) cette semaine :
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {holidays.map((h) => (
          <span
            key={h.date.toISOString()}
            className="inline-flex items-center rounded-md border border-accent-100 bg-surface px-2 py-1 font-medium capitalize text-warn-text"
          >
            {h.dayLabel} — {h.name}
          </span>
        ))}
      </div>
    </div>
  );
}
