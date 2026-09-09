import {
  SENT_STATUSES,
  hasBeenSent,
  isAwaitingResponse,
  matchesQuoteFilter,
  computeQuoteFunnelStats,
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
