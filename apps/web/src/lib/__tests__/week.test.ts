import { describe, expect, it } from 'vitest';
import {
  addWeeks,
  formatWeekRange,
  getCurrentWeekStart,
  getWeekEnd,
  getWeekNumber,
  toWeekStartParam,
} from '../week';

// Dates built from local components (new Date(y, m, d)) to stay timezone-safe:
// date-fns formats in local time, so ISO-string construction could shift a day.
const MON_2026_01_05 = new Date(2026, 0, 5); // Monday
const WED_2026_01_07 = new Date(2026, 0, 7);

describe('week helpers', () => {
  it('getWeekNumber returns the ISO week', () => {
    expect(getWeekNumber(MON_2026_01_05)).toBe(2);
  });

  it('getCurrentWeekStart snaps to the Monday of the reference week', () => {
    expect(toWeekStartParam(getCurrentWeekStart(WED_2026_01_07))).toBe('2026-01-05');
  });

  it('addWeeks shifts by 7-day blocks', () => {
    expect(toWeekStartParam(addWeeks(MON_2026_01_05, 1))).toBe('2026-01-12');
    expect(toWeekStartParam(addWeeks(MON_2026_01_05, -1))).toBe('2025-12-29');
  });

  it('getWeekEnd returns the Sunday of the week', () => {
    expect(toWeekStartParam(getWeekEnd(MON_2026_01_05))).toBe('2026-01-11');
  });

  it('formatWeekRange produces a French range label', () => {
    const label = formatWeekRange(MON_2026_01_05);
    expect(label.startsWith('Semaine du ')).toBe(true);
    expect(label).toContain('2026');
  });

  it('toWeekStartParam formats as yyyy-MM-dd', () => {
    expect(toWeekStartParam(MON_2026_01_05)).toBe('2026-01-05');
  });
});
