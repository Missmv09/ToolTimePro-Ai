/**
 * Quote status helpers shared by the Quotes dashboard.
 *
 * A quote's `status` column records where it is *right now* in its lifecycle
 * (draft → pending_approval → sent → viewed → approved | rejected). "Sent" is
 * therefore a milestone every accepted or declined quote has already passed,
 * not a state it stays in. The dashboard's Sent tab and stats use the
 * milestone meaning so users can compare what went out against what was
 * accepted or declined.
 */

/** Statuses a quote has once it has gone out to the customer. */
export const SENT_STATUSES = ['sent', 'viewed', 'approved', 'rejected'] as const

/** Sent quotes the customer has not yet answered. */
export const AWAITING_RESPONSE_STATUSES = ['sent', 'viewed'] as const

export function hasBeenSent(status: string): boolean {
  return (SENT_STATUSES as readonly string[]).includes(status)
}

export function isAwaitingResponse(status: string): boolean {
  return (AWAITING_RESPONSE_STATUSES as readonly string[]).includes(status)
}

/**
 * Does a quote belong in the given dashboard tab?
 *
 * - `all` shows everything.
 * - `sent` shows every quote that has gone out, whatever the customer did with it.
 * - `needs_follow_up` is decided by the caller (it depends on follow-up dates),
 *   so pass the result in via `needsFollowUp`.
 * - any other value matches the status column exactly.
 */
export function matchesQuoteFilter(
  quote: { status: string },
  filter: string,
  needsFollowUp = false,
): boolean {
  if (filter === 'all') return true
  if (filter === 'needs_follow_up') return needsFollowUp
  if (filter === 'sent') return hasBeenSent(quote.status)
  return quote.status === filter
}

export interface QuoteFunnelStats {
  total: number
  sentCount: number
  awaitingCount: number
  awaitingAmount: number
  acceptedCount: number
  acceptedAmount: number
  declinedCount: number
  declinedAmount: number
  /** Accepted as a whole-number percentage of everything that was sent (0 when nothing was sent). */
  conversionRate: number
}

/** Sent-vs-outcome numbers for the stats cards, computed over every quote in the company. */
export function computeQuoteFunnelStats(quotes: { status: string; total: number }[]): QuoteFunnelStats {
  const stats: QuoteFunnelStats = {
    total: quotes.length,
    sentCount: 0,
    awaitingCount: 0,
    awaitingAmount: 0,
    acceptedCount: 0,
    acceptedAmount: 0,
    declinedCount: 0,
    declinedAmount: 0,
    conversionRate: 0,
  }

  for (const quote of quotes) {
    const amount = Number(quote.total) || 0
    if (hasBeenSent(quote.status)) stats.sentCount += 1
    if (isAwaitingResponse(quote.status)) {
      stats.awaitingCount += 1
      stats.awaitingAmount += amount
    } else if (quote.status === 'approved') {
      stats.acceptedCount += 1
      stats.acceptedAmount += amount
    } else if (quote.status === 'rejected') {
      stats.declinedCount += 1
      stats.declinedAmount += amount
    }
  }

  stats.conversionRate = stats.sentCount > 0
    ? Math.round((stats.acceptedCount / stats.sentCount) * 100)
    : 0

  return stats
}
