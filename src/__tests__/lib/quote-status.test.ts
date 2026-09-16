import {
  SENT_STATUSES,
  hasBeenSent,
  isAwaitingResponse,
  matchesQuoteFilter,
  computeQuoteFunnelStats,
  wonAfterReminder,
  REMINDER_ATTRIBUTION_WINDOW_DAYS,
} from '@/lib/quote-status';

describe('lib/quote-status — Sent tab semantics', () => {
  it('treats accepted and declined quotes as having been sent', () => {
    expect(SENT_STATUSES).toEqual(['sent', 'viewed', 'approved', 'rejected']);
    expect(hasBeenSent('approved')).toBe(true);
    expect(hasBeenSent('rejected')).toBe(true);
    expect(hasBeenSent('viewed')).toBe(true);
    expect(hasBeenSent('draft')).toBe(false);
    expect(hasBeenSent('pending_approval')).toBe(false);
  });

  it('only sent/viewed quotes are still awaiting a customer response', () => {
    expect(isAwaitingResponse('sent')).toBe(true);
    expect(isAwaitingResponse('viewed')).toBe(true);
    expect(isAwaitingResponse('approved')).toBe(false);
    expect(isAwaitingResponse('rejected')).toBe(false);
  });

  describe('matchesQuoteFilter', () => {
    it('keeps an accepted quote in the Sent tab', () => {
      expect(matchesQuoteFilter({ status: 'approved' }, 'sent')).toBe(true);
      expect(matchesQuoteFilter({ status: 'rejected' }, 'sent')).toBe(true);
      expect(matchesQuoteFilter({ status: 'viewed' }, 'sent')).toBe(true);
      expect(matchesQuoteFilter({ status: 'sent' }, 'sent')).toBe(true);
    });

    it('does not put unsent quotes in the Sent tab', () => {
      expect(matchesQuoteFilter({ status: 'draft' }, 'sent')).toBe(false);
      expect(matchesQuoteFilter({ status: 'pending_approval' }, 'sent')).toBe(false);
    });

    it('matches other tabs on the exact status', () => {
      expect(matchesQuoteFilter({ status: 'approved' }, 'approved')).toBe(true);
      expect(matchesQuoteFilter({ status: 'approved' }, 'viewed')).toBe(false);
      expect(matchesQuoteFilter({ status: 'sent' }, 'viewed')).toBe(false);
    });

    it('shows everything under All and defers Needs Follow-up to the caller', () => {
      expect(matchesQuoteFilter({ status: 'draft' }, 'all')).toBe(true);
      expect(matchesQuoteFilter({ status: 'sent' }, 'needs_follow_up', true)).toBe(true);
      expect(matchesQuoteFilter({ status: 'sent' }, 'needs_follow_up', false)).toBe(false);
      expect(matchesQuoteFilter({ status: 'sent' }, 'needs_follow_up')).toBe(false);
    });
  });

  describe('computeQuoteFunnelStats', () => {
    const quotes = [
      { status: 'draft', total: 100 },
      { status: 'pending_approval', total: 200 },
      { status: 'sent', total: 300 },
      { status: 'viewed', total: 400 },
      { status: 'approved', total: 500 },
      { status: 'approved', total: 600 },
      { status: 'rejected', total: 700 },
    ];

    it('counts sent against accepted and declined across the whole company', () => {
      const stats = computeQuoteFunnelStats(quotes);
      expect(stats.total).toBe(7);
      expect(stats.sentCount).toBe(5);
      expect(stats.awaitingCount).toBe(2);
      expect(stats.awaitingAmount).toBe(700);
      expect(stats.acceptedCount).toBe(2);
      expect(stats.acceptedAmount).toBe(1100);
      expect(stats.declinedCount).toBe(1);
      expect(stats.declinedAmount).toBe(700);
    });

    it('computes conversion as accepted over everything sent, not over all quotes', () => {
      expect(computeQuoteFunnelStats(quotes).conversionRate).toBe(40);
    });

    it('returns zeros and no NaN when nothing has been sent', () => {
      const stats = computeQuoteFunnelStats([{ status: 'draft', total: 50 }]);
      expect(stats.sentCount).toBe(0);
      expect(stats.conversionRate).toBe(0);
      expect(computeQuoteFunnelStats([]).conversionRate).toBe(0);
    });

    it('tolerates a missing or non-numeric total', () => {
      const stats = computeQuoteFunnelStats([
        { status: 'approved', total: undefined as unknown as number },
        { status: 'approved', total: '25' as unknown as number },
      ]);
      expect(stats.acceptedAmount).toBe(25);
    });
  });
});

describe('wonAfterReminder — crediting a reminder with an acceptance', () => {
  const day = 86400000;
  const reminded = new Date('2026-09-10T15:00:00Z');
  const iso = (ms: number) => new Date(ms).toISOString();

  it('credits an acceptance inside the window after the last reminder', () => {
    expect(wonAfterReminder({ status: 'approved', last_reminder_at: reminded.toISOString(), approved_at: iso(reminded.getTime() + 2 * day) })).toBe(true);
    expect(wonAfterReminder({ status: 'approved', last_reminder_at: reminded.toISOString(), approved_at: iso(reminded.getTime() + REMINDER_ATTRIBUTION_WINDOW_DAYS * day) })).toBe(true);
  });

  it('does not credit an acceptance outside the window, before the reminder, or without stamps', () => {
    expect(wonAfterReminder({ status: 'approved', last_reminder_at: reminded.toISOString(), approved_at: iso(reminded.getTime() + (REMINDER_ATTRIBUTION_WINDOW_DAYS + 1) * day) })).toBe(false);
    expect(wonAfterReminder({ status: 'approved', last_reminder_at: reminded.toISOString(), approved_at: iso(reminded.getTime() - day) })).toBe(false);
    expect(wonAfterReminder({ status: 'approved', last_reminder_at: null, approved_at: iso(reminded.getTime() + day) })).toBe(false);
    expect(wonAfterReminder({ status: 'approved', last_reminder_at: reminded.toISOString(), approved_at: null })).toBe(false);
  });

  it('only ever credits accepted quotes', () => {
    expect(wonAfterReminder({ status: 'rejected', last_reminder_at: reminded.toISOString(), approved_at: iso(reminded.getTime() + day) })).toBe(false);
    expect(wonAfterReminder({ status: 'viewed', last_reminder_at: reminded.toISOString(), approved_at: iso(reminded.getTime() + day) })).toBe(false);
  });

  it('rolls up into the funnel stats as reminded and recovered', () => {
    const stats = computeQuoteFunnelStats([
      { status: 'approved', total: 500, reminder_count: 1, last_reminder_at: reminded.toISOString(), approved_at: iso(reminded.getTime() + day) },
      { status: 'approved', total: 900, reminder_count: 0, last_reminder_at: null, approved_at: iso(reminded.getTime() + day) },
      { status: 'rejected', total: 200, reminder_count: 2, last_reminder_at: reminded.toISOString() },
      { status: 'sent', total: 300, reminder_count: 1, last_reminder_at: reminded.toISOString() },
    ]);
    expect(stats.remindedCount).toBe(3);
    expect(stats.recoveredCount).toBe(1);
    expect(stats.recoveredAmount).toBe(500);
    expect(stats.acceptedAmount).toBe(1400);
  });
});
