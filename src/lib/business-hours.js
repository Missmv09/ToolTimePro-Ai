// Tenant business hours + timezone helpers.
//
// `companies.business_hours` (migration 028) is edited in Settings → Company as
//   { mon: { open: '08:00', close: '17:00' }, tue: {...}, ... }
// where a missing day means closed. The public booking page historically read
// a `booking_settings.business_hours` blob keyed by long day names with an
// `enabled` flag, so this module accepts both shapes and normalizes them.
//
// Before this existed every backend booking path (booking-core, the Jenny SMS
// agent, the voice receptionist, the chatbot) hardcoded its own — and mutually
// contradictory — 8-to-5 schedule and ignored what the tenant configured.
//
// CommonJS so the Jenny libs (.js) and Netlify functions can require it; the
// TS app imports it fine too.

const SHORT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const LONG_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };

const DEFAULT_TIMEZONE = 'America/Los_Angeles';

/** Used when a tenant has not configured hours at all: Mon–Fri, 8–5. */
const DEFAULT_BUSINESS_HOURS = Object.freeze({
  mon: { open: '08:00', close: '17:00' },
  tue: { open: '08:00', close: '17:00' },
  wed: { open: '08:00', close: '17:00' },
  thu: { open: '08:00', close: '17:00' },
  fri: { open: '08:00', close: '17:00' },
});

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function toMinutes(hhmm) {
  const m = TIME_RE.exec(String(hhmm || '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function fromMinutes(mins) {
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

/**
 * Normalize any stored business-hours shape into
 * `{ mon: { open, close }, ... }` containing ONLY open days.
 * Returns null when nothing usable is configured (caller decides on defaults).
 */
function normalizeBusinessHours(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!val || typeof val !== 'object') continue;
    const lower = String(key).toLowerCase();
    let idx = SHORT_DAYS.indexOf(lower.slice(0, 3));
    if (idx === -1) idx = LONG_DAYS.indexOf(lower);
    if (idx === -1) continue;
    if (val.enabled === false || val.closed === true) continue;
    const open = toMinutes(val.open);
    const close = toMinutes(val.close);
    if (open == null || close == null || close <= open) continue;
    out[SHORT_DAYS[idx]] = { open: fromMinutes(open), close: fromMinutes(close) };
  }
  return Object.keys(out).length ? out : null;
}

/** Normalized tenant hours, falling back to the Mon–Fri 8–5 default. */
function resolveBusinessHours(raw) {
  return normalizeBusinessHours(raw) || { ...DEFAULT_BUSINESS_HOURS };
}

function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** A usable IANA timezone, falling back to the platform default. */
function resolveTimezone(tz) {
  return isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
}

/**
 * The wall-clock in `timezone` for a given instant:
 * `{ dayKey: 'mon', minutes: 510, dateISO: 'YYYY-MM-DD' }`.
 */
function localClock(timezone, now = new Date()) {
  const tz = resolveTimezone(timezone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type) => (parts.find((p) => p.type === type) || {}).value;
  const dayKey = String(get('weekday') || 'mon').toLowerCase().slice(0, 3);
  // Some engines render midnight as "24" with hour12:false.
  const hour = Number(get('hour')) % 24;
  const minutes = hour * 60 + Number(get('minute'));
  const dateISO = `${get('year')}-${get('month')}-${get('day')}`;
  return { dayKey, minutes, dateISO };
}

/** Today's YYYY-MM-DD in the tenant's timezone (not the server's UTC). */
function todayInTimezone(timezone, now = new Date()) {
  return localClock(timezone, now).dateISO;
}

/** Day key ('mon'…'sun') for a YYYY-MM-DD date string. */
function dayKeyForDate(dateISO) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return SHORT_DAYS[d.getDay()];
}

/** `{ open, close }` for the given date, or null when closed that day. */
function getDayHours(hours, dateISO) {
  const key = dayKeyForDate(dateISO);
  if (!key) return null;
  return (hours && hours[key]) || null;
}

/**
 * Is the business open right now in its timezone?
 * `hours` should already be normalized/resolved.
 */
function isOpenAt(hours, timezone, now = new Date()) {
  const { dayKey, minutes } = localClock(timezone, now);
  const day = hours && hours[dayKey];
  if (!day) return false;
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  return minutes >= open && minutes < close;
}

/**
 * Bookable start times for a day at `stepMinutes` granularity (default hourly).
 * A slot must START before closing.
 */
function slotsForDay(dayHours, stepMinutes = 60) {
  if (!dayHours) return [];
  const open = toMinutes(dayHours.open);
  const close = toMinutes(dayHours.close);
  if (open == null || close == null) return [];
  const slots = [];
  for (let m = open; m < close; m += stepMinutes) slots.push(fromMinutes(m));
  return slots;
}

/** Next YYYY-MM-DD strictly after `dateISO` on which the business is open. */
function nextOpenDate(hours, dateISO, maxDays = 14) {
  const d = new Date(`${dateISO}T00:00:00`);
  for (let i = 0; i < maxDays; i++) {
    d.setDate(d.getDate() + 1);
    if (hours[SHORT_DAYS[d.getDay()]]) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }
  return null;
}

function formatTime12(hhmm) {
  const mins = toMinutes(hhmm);
  if (mins == null) return hhmm;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${pad(m)} ${suffix}` : `${h12} ${suffix}`;
}

/**
 * Human/LLM-readable summary, e.g. "Mon–Fri 8 AM–5 PM, Sat 9 AM–1 PM".
 * Consecutive days with identical hours are collapsed into a range.
 */
function describeBusinessHours(hours) {
  if (!hours) return '';
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const groups = [];
  for (const key of order) {
    const day = hours[key];
    if (!day) continue;
    const sig = `${day.open}-${day.close}`;
    const last = groups[groups.length - 1];
    if (last && last.sig === sig && order.indexOf(last.end) === order.indexOf(key) - 1) {
      last.end = key;
    } else {
      groups.push({ start: key, end: key, sig, day });
    }
  }
  return groups
    .map((g) => {
      const label = g.start === g.end ? DAY_LABELS[g.start] : `${DAY_LABELS[g.start]}–${DAY_LABELS[g.end]}`;
      return `${label} ${formatTime12(g.day.open)}–${formatTime12(g.day.close)}`;
    })
    .join(', ');
}

module.exports = {
  DEFAULT_TIMEZONE,
  DEFAULT_BUSINESS_HOURS,
  normalizeBusinessHours,
  resolveBusinessHours,
  isValidTimezone,
  resolveTimezone,
  localClock,
  todayInTimezone,
  dayKeyForDate,
  getDayHours,
  isOpenAt,
  slotsForDay,
  nextOpenDate,
  describeBusinessHours,
  formatTime12,
};
