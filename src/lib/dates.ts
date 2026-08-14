// Date-only values ('YYYY-MM-DD', i.e. Postgres DATE columns) parse as UTC
// midnight with `new Date(str)`, which renders and compares as the PREVIOUS day
// in timezones behind UTC (e.g. US Pacific). These helpers keep date-only
// values anchored in LOCAL time. Full timestamps (with a time component) are
// passed through to the normal Date parser.

/** Parse a 'YYYY-MM-DD' date-only string as a LOCAL date (midnight local). */
export function parseLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  if (!m) return new Date(s);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 'YYYY-MM-DD' for a Date, in LOCAL time (no UTC shift). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Local midnight today. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** True when a date-only value is strictly before today (i.e. overdue/expired). */
export function isPastDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return parseLocalDate(dateStr) < startOfToday();
}

/** Whole days elapsed since a date-only value (positive = in the past). */
export function daysSince(dateStr: string): number {
  return Math.floor((startOfToday().getTime() - parseLocalDate(dateStr).getTime()) / 86400000);
}

/** Whole days from today until a date-only value (positive = in the future). */
export function daysUntil(dateStr: string): number {
  return Math.floor((parseLocalDate(dateStr).getTime() - startOfToday().getTime()) / 86400000);
}

/** Format a 'HH:MM[:SS]' 24-hour time string as 12-hour AM/PM (e.g. '2:30 PM'). */
export function formatTime12(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const [h, m = '00'] = String(timeStr).split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return String(timeStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${(m || '00').slice(0, 2)} ${ampm}`;
}
