import { isPastDate } from '@/lib/dates'

export type InvoiceFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue'

export const INVOICE_FILTERS: InvoiceFilter[] = ['all', 'draft', 'sent', 'paid', 'overdue']

/**
 * Statuses that mean the invoice has been delivered to the customer and is
 * still awaiting payment. Once the customer opens the link the public
 * endpoint flips `sent` to `viewed`, and a partial payment flips it to
 * `partial`, so the "Sent" tab must match the whole lifecycle — not just the
 * literal `sent` row value — or delivered invoices vanish from it as soon as
 * they are opened.
 */
export const DELIVERED_UNPAID_STATUSES = ['sent', 'viewed', 'partial', 'overdue'] as const

interface FilterableInvoice {
  status: string
  due_date: string | null
}

/** Mirrors the row badge: anything unpaid and past its due date is overdue. */
export function isInvoiceOverdue(invoice: FilterableInvoice): boolean {
  if (invoice.status === 'overdue') return true
  if (invoice.status === 'paid' || invoice.status === 'cancelled') return false
  return isPastDate(invoice.due_date)
}

export function matchesInvoiceFilter(invoice: FilterableInvoice, filter: InvoiceFilter | string): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'draft':
      return invoice.status === 'draft'
    case 'sent':
      return (DELIVERED_UNPAID_STATUSES as readonly string[]).includes(invoice.status)
    case 'paid':
      return invoice.status === 'paid'
    case 'overdue':
      return isInvoiceOverdue(invoice)
    default:
      return invoice.status === filter
  }
}
