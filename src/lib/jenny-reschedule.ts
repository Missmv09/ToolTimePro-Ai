/**
 * Jenny natural-language reschedule — pure logic.
 *
 * Turns a parsed reschedule instruction into a reviewable proposal, and—
 * critically—decides whether the change affects the customer's committed
 * appointment (date or start time). Customer-affecting changes are flagged as
 * needing confirmation and carry the exact message that will be texted to the
 * customer, so nobody is ever silently moved.
 *
 * No DB/network/AI here, so it's fully unit-testable. The API route handles AI
 * extraction and persistence.
 */

export interface RescheduleJob {
  id: string;
  scheduled_date: string | null; // YYYY-MM-DD
  scheduled_time_start: string | null; // HH:MM[:SS]
  scheduled_time_end: string | null;
  customerName: string | null;
  title: string | null;
}

export interface RescheduleChange {
  jobId: string;
  newDate?: string | null; // YYYY-MM-DD
  newStartTime?: string | null; // HH:MM
  newEndTime?: string | null; // HH:MM
}

export interface RescheduleSlot {
  date: string | null;
  start: string | null;
  end: string | null;
}

export interface RescheduleProposal {
  jobId: string;
  customerName: string | null;
  title: string | null;
  before: RescheduleSlot;
  after: RescheduleSlot;
  /** True when the customer's committed date or start time changes. */
  customerAffecting: boolean;
  /** Customer-affecting changes must be confirmed before applying. */
  needsConfirmation: boolean;
  /** Human-readable summary of the change. */
  summary: string;
  /** SMS to send the customer on confirm; null when not customer-affecting. */
  customerMessage: string | null;
}

/** Normalize an HH:MM[:SS] time to HH:MM for comparison/display. */
export function normalizeTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Format HH:MM as a friendly 12-hour time (e.g. "2:00 PM"). */
export function formatTime(t: string | null): string {
  const n = normalizeTime(t);
  if (!n) return '—';
  const [h, m] = n.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

/** Format YYYY-MM-DD as a friendly date (e.g. "Mon, Jun 22"). */
export function formatDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(`${d}T00:00:00`);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Resolve the resulting slot after applying a change (new value or existing). */
export function applyChange(job: RescheduleJob, change: RescheduleChange): RescheduleSlot {
  return {
    date: change.newDate !== undefined && change.newDate !== null ? change.newDate : job.scheduled_date,
    start:
      change.newStartTime !== undefined && change.newStartTime !== null
        ? normalizeTime(change.newStartTime)
        : normalizeTime(job.scheduled_time_start),
    end:
      change.newEndTime !== undefined && change.newEndTime !== null
        ? normalizeTime(change.newEndTime)
        : normalizeTime(job.scheduled_time_end),
  };
}

/**
 * Whether a change moves the customer's committed appointment. End-time-only
 * tweaks don't affect the customer's expectation of when the tech arrives.
 */
export function isCustomerAffecting(job: RescheduleJob, after: RescheduleSlot): boolean {
  const beforeDate = job.scheduled_date;
  const beforeStart = normalizeTime(job.scheduled_time_start);
  return after.date !== beforeDate || after.start !== beforeStart;
}

/** Build a reviewable proposal from a job + parsed change. */
export function buildProposal(
  job: RescheduleJob,
  change: RescheduleChange,
  companyName: string
): RescheduleProposal {
  const before: RescheduleSlot = {
    date: job.scheduled_date,
    start: normalizeTime(job.scheduled_time_start),
    end: normalizeTime(job.scheduled_time_end),
  };
  const after = applyChange(job, change);
  const customerAffecting = isCustomerAffecting(job, after);

  const who = job.customerName || job.title || 'this job';
  const summary = `Reschedule ${who} from ${formatDate(before.date)} ${formatTime(before.start)} to ${formatDate(after.date)} ${formatTime(after.start)}`;

  const greeting = job.customerName ? `Hi ${job.customerName.split(' ')[0]}, ` : '';
  const customerMessage = customerAffecting
    ? `${greeting}your appointment with ${companyName} has been rescheduled to ${formatDate(after.date)} at ${formatTime(after.start)}. Reply STOP to opt out.`
    : null;

  return {
    jobId: job.id,
    customerName: job.customerName,
    title: job.title,
    before,
    after,
    customerAffecting,
    needsConfirmation: customerAffecting,
    summary,
    customerMessage,
  };
}
