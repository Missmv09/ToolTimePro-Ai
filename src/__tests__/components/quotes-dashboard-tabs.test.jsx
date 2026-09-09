/**
 * Renders the real Quotes dashboard page against a mocked Supabase and checks
 * the Sent-tab semantics end to end in the UI:
 *   - accepted and declined quotes stay in the Sent tab
 *   - stats cards cover the whole company regardless of the active tab
 *   - the View link opens the customer page in preview mode
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

const { createQueryMock } = require('@/__mocks__/supabase-query-mock');

const COMPANY_ID = 'company-1';
const USER_ID = 'user-1';
const now = new Date().toISOString();

const CUSTOMER = { id: 'cust-1', name: 'Jane Customer', email: 'jane@example.com', phone: null, sms_consent: false };

function quote(id, status, total, quote_number) {
  return {
    id: `00000000-0000-4000-8000-00000000000${id}`,
    quote_number,
    customer_id: CUSTOMER.id,
    customer: CUSTOMER,
    status,
    subtotal: total,
    tax_rate: 0,
    tax_amount: 0,
    total,
    notes: null,
    valid_until: null,
    created_by: USER_ID,
    sent_by: status === 'draft' || status === 'pending_approval' ? null : USER_ID,
    sent_at: status === 'draft' || status === 'pending_approval' ? null : now,
    follow_up_date: null,
    created_at: now,
    updated_at: now,
    items: [{ id: `item-${id}`, description: 'Work', quantity: 1, unit_price: total, total_price: total, sort_order: 0 }],
  };
}

const QUOTES = [
  quote(1, 'draft', 100, 'Q-DRAFT'),
  quote(2, 'pending_approval', 200, 'Q-PENDING'),
  quote(3, 'sent', 300, 'Q-SENT'),
  quote(4, 'viewed', 400, 'Q-VIEWED'),
  quote(5, 'approved', 500, 'Q-ACCEPTED-A'),
  quote(6, 'approved', 600, 'Q-ACCEPTED-B'),
  quote(7, 'rejected', 700, 'Q-DECLINED'),
];

const sb = createQueryMock(({ table }) => {
  switch (table) {
    case 'quotes':
      return { data: QUOTES, error: null };
    case 'users':
      return { data: [{ id: USER_ID, full_name: 'Owner Person' }], error: null };
    case 'customers':
      return { data: [CUSTOMER], error: null };
    default:
      return { data: [], error: null };
  }
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args) => sb.from(...args),
    auth: { getSession: jest.fn(async () => ({ data: { session: { access_token: 'tok' } } })) },
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: USER_ID, email: 'owner@example.com' },
    dbUser: { id: USER_ID, company_id: COMPANY_ID, role: 'owner', full_name: 'Owner Person' },
    company: { id: COMPANY_ID, name: 'Acme Plumbing' },
    isLoading: false,
  }),
}));

jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

const QuotesPage = require('@/app/dashboard/quotes/page').default;

function tab(label) {
  return screen.getByRole('button', { name: new RegExp(`^${label}( \\(\\d+\\))?$`) });
}

function rowsInTable() {
  const table = screen.getByRole('table');
  return within(table).queryAllByText(/^Q-/).map((el) => el.textContent);
}

async function renderPage() {
  render(<QuotesPage />);
  await waitFor(() => expect(screen.getByText('Q-SENT')).toBeInTheDocument());
}

describe('Quotes dashboard — Sent tab and funnel stats', () => {
  it('only asks the database for the company, never for a single status', async () => {
    await renderPage();
    const quoteReads = sb.calls.filter((c) => c.table === 'quotes' && c.op === 'select');
    expect(quoteReads.length).toBeGreaterThan(0);
    for (const call of quoteReads) {
      expect(call.filters.some((f) => f.name === 'eq' && f.args[0] === 'company_id' && f.args[1] === COMPANY_ID)).toBe(true);
      expect(call.filters.some((f) => f.name === 'eq' && f.args[0] === 'status')).toBe(false);
    }
  });

  it('shows counts on the tabs, with Sent covering accepted and declined too', async () => {
    await renderPage();
    expect(tab('Sent')).toHaveTextContent('Sent (5)');
    expect(tab('Viewed')).toHaveTextContent('Viewed (1)');
    expect(tab('Accepted')).toHaveTextContent('Accepted (2)');
    expect(tab('Declined')).toHaveTextContent('Declined (1)');
    expect(tab('Draft')).toHaveTextContent('Draft (1)');
  });

  it('keeps accepted and declined quotes in the Sent tab', async () => {
    await renderPage();
    fireEvent.click(tab('Sent'));
    const rows = rowsInTable();
    expect(rows).toEqual(expect.arrayContaining(['Q-SENT', 'Q-VIEWED', 'Q-ACCEPTED-A', 'Q-ACCEPTED-B', 'Q-DECLINED']));
    expect(rows).not.toContain('Q-DRAFT');
    expect(rows).not.toContain('Q-PENDING');
    expect(rows).toHaveLength(5);
  });

  it('keeps Accepted and Declined tabs exact', async () => {
    await renderPage();
    fireEvent.click(tab('Accepted'));
    expect(rowsInTable()).toEqual(['Q-ACCEPTED-A', 'Q-ACCEPTED-B']);
    fireEvent.click(tab('Declined'));
    expect(rowsInTable()).toEqual(['Q-DECLINED']);
  });

  it('shows company-wide funnel stats that do not change when switching tabs', async () => {
    await renderPage();
    const expectStats = () => {
      expect(screen.getByText('2 of 5 sent')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('2 awaiting response · $700')).toBeInTheDocument();
      expect(screen.getByText('$1,100')).toBeInTheDocument();
    };
    expectStats();
    fireEvent.click(tab('Viewed'));
    expect(rowsInTable()).toEqual(['Q-VIEWED']);
    expectStats();
    fireEvent.click(tab('Draft'));
    expect(rowsInTable()).toEqual(['Q-DRAFT']);
    expectStats();
  });

  it('opens the customer page in preview mode so viewing does not mark the quote as viewed', async () => {
    await renderPage();
    fireEvent.click(tab('Sent'));
    const viewLinks = screen.getAllByRole('link', { name: 'View' });
    expect(viewLinks).toHaveLength(5);
    for (const link of viewLinks) {
      expect(link).toHaveAttribute('href', expect.stringMatching(/^\/quote\/[0-9a-f-]+\?preview=1$/));
    }
  });
});
