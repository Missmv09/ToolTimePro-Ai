/**
 * Weekly digest of Jenny's autonomous actions.
 *
 * Jenny runs fifteen background actions on a cron and writes every one to
 * jenny_action_log. The work is real but invisible: a contractor never sees
 * the overdue invoice that got flagged or the cold lead that got a follow-up
 * text, so the product feels like a calendar with a chatbot bolted on.
 *
 * This module turns that ledger into the one artifact that makes the
 * autonomy legible — "here is what Jenny did for you last week."
 *
 * Pure functions, no I/O, so the aggregation can be unit-tested without a
 * database. The API route owns fetching and sending.
 */

/** Every action type the cron dispatches. Keep in sync with migration 051. */
export const DIGEST_ACTION_TYPES = [
  'auto_dispatch',
  'lead_follow_up',
  'cash_flow_alert',
  'job_costing',
  'review_request',
  'cert_expiration',
  'insurance_expiry',
  'w9_compliance',
  'classification_review',
  'compliance_escalation',
  'quote_expiration',
  'contractor_payment',
  'contract_end_date',
] as const;

export type DigestActionType = (typeof DIGEST_ACTION_TYPES)[number];

/** The subset of a jenny_action_log row the digest reads. */
export interface DigestLogRow {
  action_type: string;
  title: string;
  status: string | null;
  created_at: string;
  target_name?: string | null;
}

export interface DigestItem {
  title: string;
  /** ISO date (YYYY-MM-DD) the action was taken. */
  date: string;
}

export interface DigestCategory {
  key: CategoryKey;
  label: string;
  /** One line explaining what this group of actions is for. */
  blurb: string;
  /** Actions completed in the period. */
  count: number;
  /** Actions surfaced but still waiting on the owner. */
  awaiting: number;
  /** A sample of real action titles, newest first. */
  items: DigestItem[];
}

export interface WeeklyDigest {
  /** Inclusive ISO date the period starts. */
  periodStart: string;
  /** Inclusive ISO date the period ends. */
  periodEnd: string;
  /** Actions Jenny completed without the owner doing anything. */
  totalCompleted: number;
  /** Actions surfaced for the owner that nobody has acted on yet. */
  totalAwaiting: number;
  /** Non-empty categories, in display order. */
  categories: DigestCategory[];
  /**
   * True when there is nothing worth emailing about. Callers should skip the
   * send — a "Jenny did 0 things" email actively argues against the product.
   */
  isEmpty: boolean;
}

type CategoryKey = 'money' | 'jobs' | 'growth' | 'compliance';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  blurb: string;
  types: DigestActionType[];
}

/**
 * Action types grouped into the four things an owner actually cares about.
 *
 * Ordered by what a contractor opens the email for: money first, then the
 * work, then pipeline, then the obligations they would rather not think about
 * until one becomes a penalty.
 */
const CATEGORIES: CategoryDef[] = [
  {
    key: 'money',
    label: 'Money',
    blurb: 'Cash Jenny chased, protected, or accounted for.',
    types: ['cash_flow_alert', 'quote_expiration', 'contractor_payment', 'job_costing'],
  },
  {
    key: 'jobs',
    label: 'Jobs & Crew',
    blurb: 'Work Jenny scheduled and assigned for you.',
    types: ['auto_dispatch'],
  },
  {
    key: 'growth',
    label: 'Leads & Reviews',
    blurb: 'Pipeline Jenny kept warm while you were on site.',
    types: ['lead_follow_up', 'review_request'],
  },
  {
    key: 'compliance',
    label: 'Compliance & Workforce',
    blurb: 'Paperwork and deadlines Jenny watched so they never became penalties.',
    types: [
      'compliance_escalation',
      'classification_review',
      'cert_expiration',
      'insurance_expiry',
      'w9_compliance',
      'contract_end_date',
    ],
  },
];

/** Most action titles a single category shows before it starts summarizing. */
const MAX_ITEMS_PER_CATEGORY = 4;

const CATEGORY_BY_TYPE = new Map<string, CategoryKey>(
  CATEGORIES.flatMap((c) => c.types.map((t) => [t as string, c.key] as const))
);

/** ISO date portion of a timestamp, without pulling in a date library. */
function toISODate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

/**
 * Aggregate raw log rows into a digest.
 *
 * `rows` should already be scoped to one company and one time window — this
 * function does not filter by date, so the caller's query defines the period.
 * Rows whose action_type is not in a category (platform-wide alerts like
 * price_staleness and hr_law_update) are ignored: they are operator signals,
 * not work done for this contractor.
 */
export function buildWeeklyDigest(
  rows: DigestLogRow[],
  periodStart: string,
  periodEnd: string
): WeeklyDigest {
  const completed = new Map<CategoryKey, DigestLogRow[]>();
  const awaiting = new Map<CategoryKey, number>();

  for (const row of rows) {
    const key = CATEGORY_BY_TYPE.get(row.action_type);
    if (!key) continue;

    if (row.status === 'executed') {
      const list = completed.get(key) || [];
      list.push(row);
      completed.set(key, list);
    } else if (row.status === 'pending') {
      awaiting.set(key, (awaiting.get(key) || 0) + 1);
    }
    // 'skipped' and 'failed' are deliberately excluded. A skipped action did
    // no work, and a failed one is an internal problem — neither belongs in a
    // message whose whole purpose is to be trusted.
  }

  const categories: DigestCategory[] = [];
  let totalCompleted = 0;
  let totalAwaiting = 0;

  for (const def of CATEGORIES) {
    const rowsForCategory = completed.get(def.key) || [];
    const awaitingCount = awaiting.get(def.key) || 0;

    totalCompleted += rowsForCategory.length;
    totalAwaiting += awaitingCount;

    if (rowsForCategory.length === 0 && awaitingCount === 0) continue;

    categories.push({
      key: def.key,
      label: def.label,
      blurb: def.blurb,
      count: rowsForCategory.length,
      awaiting: awaitingCount,
      items: selectItems(rowsForCategory),
    });
  }

  return {
    periodStart,
    periodEnd,
    totalCompleted,
    totalAwaiting,
    categories,
    isEmpty: totalCompleted === 0 && totalAwaiting === 0,
  };
}

/**
 * Pick the sample of titles shown under a category.
 *
 * Newest first, and identical titles collapse — several actions in a week
 * legitimately share a title ("Invoice overdue 14 days"), and repeating it
 * four times reads like a bug rather than like volume. The count above the
 * list already carries the volume.
 */
function selectItems(rows: DigestLogRow[]): DigestItem[] {
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const seen = new Set<string>();
  const items: DigestItem[] = [];

  for (const row of sorted) {
    if (seen.has(row.title)) continue;
    seen.add(row.title);
    items.push({ title: row.title, date: toISODate(row.created_at) });
    if (items.length >= MAX_ITEMS_PER_CATEGORY) break;
  }

  return items;
}

/**
 * The digest's headline.
 *
 * Deliberately concrete — a number the owner can check against the dashboard.
 * Vague summaries ("Jenny was busy!") are worse than none: they read as
 * marketing, and the whole point is that this is a receipt.
 */
export function digestHeadline(digest: WeeklyDigest): string {
  const { totalCompleted, totalAwaiting } = digest;

  if (totalCompleted === 0) {
    return `${totalAwaiting} ${totalAwaiting === 1 ? 'item needs' : 'items need'} your attention`;
  }

  const base = `Jenny handled ${totalCompleted} ${totalCompleted === 1 ? 'thing' : 'things'} for you`;
  return totalAwaiting > 0
    ? `${base} — ${totalAwaiting} more ${totalAwaiting === 1 ? 'needs' : 'need'} you`
    : base;
}

/**
 * The seven-day window ending on the day before `today`.
 *
 * Exclusive of `today` so a Monday-morning send covers Mon–Sun complete,
 * rather than a partial current day that would undercount.
 */
export function weeklyPeriod(today: Date): { start: string; end: string } {
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
