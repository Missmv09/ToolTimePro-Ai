import {
  buildWeeklyDigest,
  digestHeadline,
  weeklyPeriod,
  type DigestLogRow,
} from '@/lib/jenny-digest';

const START = '2026-08-10';
const END = '2026-08-16';

function row(overrides: Partial<DigestLogRow> = {}): DigestLogRow {
  return {
    action_type: 'auto_dispatch',
    title: 'Assigned job to Maria',
    status: 'executed',
    created_at: '2026-08-12T10:00:00Z',
    ...overrides,
  };
}

describe('buildWeeklyDigest', () => {
  it('reports empty for no rows', () => {
    const digest = buildWeeklyDigest([], START, END);
    expect(digest.isEmpty).toBe(true);
    expect(digest.totalCompleted).toBe(0);
    expect(digest.categories).toEqual([]);
  });

  it('counts executed actions and groups them by category', () => {
    const digest = buildWeeklyDigest(
      [
        row({ action_type: 'auto_dispatch' }),
        row({ action_type: 'cash_flow_alert', title: 'Invoice #12 overdue 14 days' }),
        row({ action_type: 'quote_expiration', title: 'Quote for Rivera expires Friday' }),
        row({ action_type: 'lead_follow_up', title: 'Texted cold lead' }),
      ],
      START,
      END
    );

    expect(digest.totalCompleted).toBe(4);
    expect(digest.isEmpty).toBe(false);

    const money = digest.categories.find((c) => c.key === 'money');
    expect(money?.count).toBe(2);
    expect(digest.categories.find((c) => c.key === 'jobs')?.count).toBe(1);
    expect(digest.categories.find((c) => c.key === 'growth')?.count).toBe(1);
  });

  it('orders categories money, jobs, growth, compliance', () => {
    const digest = buildWeeklyDigest(
      [
        row({ action_type: 'cert_expiration', title: 'License expires soon' }),
        row({ action_type: 'lead_follow_up', title: 'Texted lead' }),
        row({ action_type: 'auto_dispatch' }),
        row({ action_type: 'cash_flow_alert', title: 'Invoice overdue' }),
      ],
      START,
      END
    );

    expect(digest.categories.map((c) => c.key)).toEqual(['money', 'jobs', 'growth', 'compliance']);
  });

  it('omits categories with no activity', () => {
    const digest = buildWeeklyDigest([row({ action_type: 'auto_dispatch' })], START, END);
    expect(digest.categories.map((c) => c.key)).toEqual(['jobs']);
  });

  it('counts pending actions separately as awaiting', () => {
    const digest = buildWeeklyDigest(
      [
        row({ action_type: 'cash_flow_alert', title: 'Invoice overdue', status: 'pending' }),
        row({ action_type: 'cash_flow_alert', title: 'Other invoice overdue', status: 'executed' }),
      ],
      START,
      END
    );

    expect(digest.totalCompleted).toBe(1);
    expect(digest.totalAwaiting).toBe(1);

    const money = digest.categories.find((c) => c.key === 'money');
    expect(money?.count).toBe(1);
    expect(money?.awaiting).toBe(1);
  });

  it('excludes skipped and failed actions from both counts', () => {
    const digest = buildWeeklyDigest(
      [
        row({ status: 'skipped' }),
        row({ status: 'failed' }),
      ],
      START,
      END
    );

    expect(digest.totalCompleted).toBe(0);
    expect(digest.totalAwaiting).toBe(0);
    expect(digest.isEmpty).toBe(true);
  });

  it('ignores platform-wide action types that are not customer work', () => {
    const digest = buildWeeklyDigest(
      [
        row({ action_type: 'price_staleness', title: 'Lumber prices stale' }),
        row({ action_type: 'hr_law_update', title: 'CA rules updated' }),
      ],
      START,
      END
    );

    expect(digest.isEmpty).toBe(true);
  });

  it('shows a category still needing attention even with nothing completed', () => {
    const digest = buildWeeklyDigest(
      [row({ action_type: 'w9_compliance', title: 'W-9 missing', status: 'pending' })],
      START,
      END
    );

    expect(digest.isEmpty).toBe(false);
    const compliance = digest.categories.find((c) => c.key === 'compliance');
    expect(compliance?.count).toBe(0);
    expect(compliance?.awaiting).toBe(1);
  });

  it('lists sample items newest first with their date', () => {
    const digest = buildWeeklyDigest(
      [
        row({ title: 'Older job', created_at: '2026-08-11T09:00:00Z' }),
        row({ title: 'Newer job', created_at: '2026-08-14T09:00:00Z' }),
      ],
      START,
      END
    );

    const jobs = digest.categories.find((c) => c.key === 'jobs');
    expect(jobs?.items.map((i) => i.title)).toEqual(['Newer job', 'Older job']);
    expect(jobs?.items[0].date).toBe('2026-08-14');
  });

  it('collapses duplicate titles but keeps the full count', () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      row({ title: 'Invoice overdue 14 days', action_type: 'cash_flow_alert', created_at: `2026-08-1${i}T09:00:00Z` })
    );

    const digest = buildWeeklyDigest(rows, START, END);
    const money = digest.categories.find((c) => c.key === 'money');

    expect(money?.count).toBe(5);
    expect(money?.items).toHaveLength(1);
  });

  it('caps the sample at four distinct items', () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      row({ title: `Job ${i}`, created_at: `2026-08-10T0${i}:00:00Z` })
    );

    const digest = buildWeeklyDigest(rows, START, END);
    const jobs = digest.categories.find((c) => c.key === 'jobs');

    expect(jobs?.count).toBe(9);
    expect(jobs?.items).toHaveLength(4);
  });

  it('carries the period through unchanged', () => {
    const digest = buildWeeklyDigest([row()], START, END);
    expect(digest.periodStart).toBe(START);
    expect(digest.periodEnd).toBe(END);
  });
});

describe('digestHeadline', () => {
  it('leads with the completed count', () => {
    const digest = buildWeeklyDigest([row(), row({ title: 'Another' })], START, END);
    expect(digestHeadline(digest)).toBe('Jenny handled 2 things for you');
  });

  it('uses the singular for one action', () => {
    const digest = buildWeeklyDigest([row()], START, END);
    expect(digestHeadline(digest)).toBe('Jenny handled 1 thing for you');
  });

  it('appends the count still waiting on the owner', () => {
    const digest = buildWeeklyDigest(
      [row(), row({ title: 'Overdue', action_type: 'cash_flow_alert', status: 'pending' })],
      START,
      END
    );
    expect(digestHeadline(digest)).toBe('Jenny handled 1 thing for you — 1 more needs you');
  });

  it('falls back to the attention count when nothing completed', () => {
    const digest = buildWeeklyDigest(
      [row({ status: 'pending' }), row({ title: 'Second', status: 'pending' })],
      START,
      END
    );
    expect(digestHeadline(digest)).toBe('2 items need your attention');
  });
});

describe('weeklyPeriod', () => {
  it('covers the seven complete days before today', () => {
    // Monday 2026-08-17 -> the previous Monday through Sunday.
    expect(weeklyPeriod(new Date('2026-08-17T15:00:00Z'))).toEqual({
      start: '2026-08-10',
      end: '2026-08-16',
    });
  });

  it('excludes today so a partial day never undercounts', () => {
    const { end } = weeklyPeriod(new Date('2026-08-17T23:59:00Z'));
    expect(end).toBe('2026-08-16');
  });

  it('crosses a month boundary correctly', () => {
    expect(weeklyPeriod(new Date('2026-09-02T15:00:00Z'))).toEqual({
      start: '2026-08-26',
      end: '2026-09-01',
    });
  });
});
