import { getWeekHolidays } from '@/lib/holidays';

interface HolidayBannerProps {
  weekStart: Date;
}

export function HolidayBanner({ weekStart }: HolidayBannerProps) {
  const holidays = getWeekHolidays(weekStart);
  if (holidays.length === 0) return null;

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-warn-text/30 bg-warn px-4 py-2 text-[12.5px] text-warn-text">
      <span className="flex flex-shrink-0 items-center gap-2 font-semibold">
        <span aria-hidden>🗓</span>
        Jour(s) fermé(s) cette semaine :
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {holidays.map((h) => (
          <span
            key={h.date.toISOString()}
            className="inline-flex items-center rounded bg-accent-100 px-2 py-0.5 text-[12px] font-semibold capitalize text-warn-text"
          >
            {h.dayLabel} — {h.name} — jour férié
          </span>
        ))}
      </div>
    </div>
  );
}
