import { matchesInvoiceFilter, isInvoiceOverdue } from '@/lib/invoice-filters'

const past = '2000-01-01'
const future = '2999-01-01'

describe('matchesInvoiceFilter', () => {
  it('shows every status under "all"', () => {
    for (const status of ['draft', 'sent', 'viewed', 'partial', 'overdue', 'paid', 'cancelled']) {
      expect(matchesInvoiceFilter({ status, due_date: null }, 'all')).toBe(true)
    }
  })

  it('keeps a sent invoice in the Sent tab after the customer opens it (status becomes "viewed")', () => {
    expect(matchesInvoiceFilter({ status: 'sent', due_date: future }, 'sent')).toBe(true)
    expect(matchesInvoiceFilter({ status: 'viewed', due_date: future }, 'sent')).toBe(true)
    expect(matchesInvoiceFilter({ status: 'partial', due_date: future }, 'sent')).toBe(true)
    expect(matchesInvoiceFilter({ status: 'overdue', due_date: past }, 'sent')).toBe(true)
  })

  it('does not put drafts, paid or cancelled invoices in the Sent tab', () => {
    expect(matchesInvoiceFilter({ status: 'draft', due_date: future }, 'sent')).toBe(false)
    expect(matchesInvoiceFilter({ status: 'paid', due_date: past }, 'sent')).toBe(false)
    expect(matchesInvoiceFilter({ status: 'cancelled', due_date: past }, 'sent')).toBe(false)
  })

  it('matches drafts and paid invoices by exact status', () => {
    expect(matchesInvoiceFilter({ status: 'draft', due_date: null }, 'draft')).toBe(true)
    expect(matchesInvoiceFilter({ status: 'sent', due_date: null }, 'draft')).toBe(false)
    expect(matchesInvoiceFilter({ status: 'paid', due_date: null }, 'paid')).toBe(true)
    expect(matchesInvoiceFilter({ status: 'viewed', due_date: null }, 'paid')).toBe(false)
  })

  it('derives the Overdue tab from the due date, since nothing writes an "overdue" status', () => {
    expect(matchesInvoiceFilter({ status: 'sent', due_date: past }, 'overdue')).toBe(true)
    expect(matchesInvoiceFilter({ status: 'viewed', due_date: past }, 'overdue')).toBe(true)
    expect(matchesInvoiceFilter({ status: 'overdue', due_date: null }, 'overdue')).toBe(true)
    expect(matchesInvoiceFilter({ status: 'sent', due_date: future }, 'overdue')).toBe(false)
    expect(matchesInvoiceFilter({ status: 'sent', due_date: null }, 'overdue')).toBe(false)
    expect(matchesInvoiceFilter({ status: 'paid', due_date: past }, 'overdue')).toBe(false)
    expect(matchesInvoiceFilter({ status: 'cancelled', due_date: past }, 'overdue')).toBe(false)
  })
})

describe('isInvoiceOverdue', () => {
  it('is false for paid and cancelled invoices even when past due', () => {
    expect(isInvoiceOverdue({ status: 'paid', due_date: past })).toBe(false)
    expect(isInvoiceOverdue({ status: 'cancelled', due_date: past })).toBe(false)
  })

  it('is true for an unpaid invoice past its due date', () => {
    expect(isInvoiceOverdue({ status: 'sent', due_date: past })).toBe(true)
  })
})
