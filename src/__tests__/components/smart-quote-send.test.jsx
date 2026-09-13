/**
 * Renders the real Smart Quote page against a mocked Supabase and network and
 * drives the full "Send Quote" flow with SMS + email selected. The sandbox
 * Cypress suite only covers the Quick Quote modal, so this is the only
 * automated check that the Smart Quote send path saves, notifies, and shows
 * the success state without throwing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
const { createQueryMock } = require('@/__mocks__/supabase-query-mock');

const CUSTOMER = { id: 'c1', name: 'Jane Customer', phone: '+15551234567', email: 'jane@example.com', address: '1 Main St, Los Angeles, CA 90001', state: 'CA', sms_consent: true };
const sb = createQueryMock(({ table }) => {
  if (table === 'customers') return { data: [CUSTOMER], error: null };
  return { data: [], error: null };
});
jest.mock('@/lib/supabase', () => ({ supabase: { from: (...a) => sb.from(...a), auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } } }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'u' }, dbUser: { id: 'u', company_id: 'co', role: 'owner', full_name: 'Owner' },
  company: { id: 'co', name: 'Acme', default_tax_rate: '8.75' }, isLoading: false }) }));

global.fetch = jest.fn(async (url, opts) => {
  const body = opts && opts.body ? JSON.parse(opts.body) : null;
  const ok = (json) => ({ ok: true, status: 200, json: async () => json });
  if (String(url).includes('/api/quote/save')) return ok({ quote: { id: '11111111-2222-4333-8444-555555555555', quote_number: null, ...body.quoteData }, success: true });
  if (String(url).includes('/api/sms')) return ok({ success: true });
  if (String(url).includes('/api/quote/send')) return ok({ success: true });
  return ok({});
});
Element.prototype.scrollIntoView = jest.fn();

const Page = require('@/app/dashboard/smart-quote/page').default;

describe('Smart Quote — Send Quote', () => {
  it('saves as sent, sends SMS and email, and shows the success state', async () => {
    render(<Page />);
    const search = await screen.findByPlaceholderText('Search by name, phone, or email...');
    fireEvent.change(search, { target: { value: 'Jane' } });
    fireEvent.click(await screen.findByText('Jane Customer'));
    expect(screen.getByText('SMS Opted In')).toBeInTheDocument();
    fireEvent.click(screen.getByText('+ Add Line Item'));
    fireEvent.click(screen.getByRole('button', { name: 'Both' }));
    const send = screen.getByRole('button', { name: /Send Quote/ });
    expect(send).not.toBeDisabled();
    fireEvent.click(send);

    await waitFor(() => expect(screen.getByText('Quote Saved & Sent!')).toBeInTheDocument(), { timeout: 5000 });

    const calls = global.fetch.mock.calls.map(([url, opts]) => [String(url), opts && opts.body ? JSON.parse(opts.body) : null]);
    const save = calls.find(([u]) => u.includes('/api/quote/save'));
    expect(save).toBeDefined();
    expect(save[1].quoteData).toMatchObject({ status: 'sent', customer_id: 'c1', company_id: 'co', sent_by: 'u' });
    expect(save[1].quoteData.sent_at).toEqual(expect.any(String));
    expect(calls.some(([u]) => u.includes('/api/sms'))).toBe(true);
    expect(calls.some(([u]) => u.includes('/api/quote/send'))).toBe(true);
  });
});
