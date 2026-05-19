const DAKAR_TZ = 'Africa/Dakar';

/** Returns the current date/time in Africa/Dakar timezone (UTC+0 — no DST). */
export function now(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: DAKAR_TZ }));
}

/** Formats a date in Africa/Dakar timezone. */
export function formatDakar(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString('fr-SN', {
    timeZone: DAKAR_TZ,
    ...options,
  });
}

/** Returns ISO string anchored to Africa/Dakar. */
export function toISODakar(date: Date): string {
  return date.toISOString();
}

export const TIMEZONE = DAKAR_TZ;
