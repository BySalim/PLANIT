import { getWeekHolidays } from '@/lib/holidays';

interface HolidayBannerProps {
  weekStart: Date;
}

export function HolidayBanner({ weekStart }: HolidayBannerProps) {
  const holidays = getWeekHolidays(weekStart);
  if (holidays.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-[12.5px]"
      style={{ background: '#FEF3C7', borderColor: '#FDE68A', color: '#92400E' }}
    >
      <span className="flex flex-shrink-0 items-center gap-2 font-semibold">
        <span aria-hidden>🗓</span>
        Jour(s) fermé(s) cette semaine :
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {holidays.map((h) => (
          <span
            key={h.date.toISOString()}
            className="inline-flex items-center rounded px-2 py-0.5 text-[12px] font-semibold capitalize"
            style={{ background: '#FCD34D', color: '#78350F' }}
          >
            {h.dayLabel} — {h.name} — jour férié
          </span>
        ))}
      </div>
    </div>
  );
}
