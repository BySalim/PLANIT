import { addDays, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const WEEK_LENGTH_DAYS = 7;

/**
 * Africa/Dakar runs on UTC+0 year-round (no DST), so plain Date math is safe
 * when we anchor to ISO date strings (YYYY-MM-DD) without a time component.
 */
export function getCurrentWeekStart(reference: Date = new Date()): Date {
  return startOfWeek(reference, { weekStartsOn: 1 });
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * WEEK_LENGTH_DAYS);
}

export function getWeekEnd(weekStart: Date): Date {
  return addDays(weekStart, WEEK_LENGTH_DAYS - 1);
}

export function formatWeekRange(weekStart: Date): string {
  const end = getWeekEnd(weekStart);
  const startLabel = format(weekStart, 'd MMM', { locale: fr });
  const endLabel = format(end, 'd MMM yyyy', { locale: fr });
  return `Semaine du ${startLabel} au ${endLabel}`;
}

/** ISO date string (YYYY-MM-DD) used by the backend `weekStart` query param. */
export function toWeekStartParam(weekStart: Date): string {
  return format(weekStart, 'yyyy-MM-dd');
}
