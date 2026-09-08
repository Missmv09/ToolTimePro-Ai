/**
 * @jest-environment node
 */

// Tests for the shared after-payment pipeline: idempotent payment recording,
// receipt email/SMS, the delayed review-request queue, Checkout Session
// processing (webhook + confirm), and card-on-file charges.

const mockSendReceipt = jest.fn().mockResolvedValue({ id: 'em_1' });
const mockSendReview = jest.fn().mockResolvedValue({ id: 'em_2' });
jest.mock('@/lib/email', () => ({
  sendPaymentReceiptEmail: (...a) => mockSendReceipt(...a),
  sendReviewRequestEmail: (...a) => mockSendReview(...a),
}));

const mockSendSMS = jest.fn().mockResolvedValue({ success: true, messageId: 'SM1' });
jest.mock('@/lib/twilio', () => ({
  sendSMS: (...a) => mockSendSMS(...a),
  SMS_TEMPLATES: {
    paymentReceipt: (d) => `RECEIPT ${d.amount} ${d.invoiceNumber}`,
    depositReceipt: (d) => `DEPOSIT ${d.amount} bal ${d.balanceDue}`,
    reviewRequest: (d) => `REVIEW ${d.reviewLink || ''}`,
  },
}));

const mockRetrieve = jest.fn();
const mockPiCreate = jest.fn();
jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({ paymentIntents: { retrieve: mockRetrieve, create: mockPiCreate } }),
}));

const { createQueryMock, filterValue } = require('@/__mocks__/supabase-query-mock');
const {
  recordInvoicePayment,
  runAfterPaymentHooks,
  scheduleReviewRequest,
  processCheckoutSession,
  chargeCardOnFile,
  paymentLabel,
} = require('@/lib/after-payment');

const INVOICE = {
  id: 'inv-1',
  company_id: 'co-1',
  customer_id: 'cust-1',
  job_id: 'job-1',
  quote_id: null,
  invoice_number: 'INV-100',
  total: 200,
  amount_paid: 0,
  status: 'sent',
};
const COMPANY = { id: 'co-1', name: 'Acme Plumbing', phone: '5551234567', email: 'hi@acme.test', google_review_link: 'https://g.page/acme', yelp_review_link: null, review_delay_hours: 2 };
const CUSTOMER = { id: 'cust-1', name: 'Jane Doe', email: 'jane@example.com', phone: '5559876543', sms_consent: true, business_name: null };

/** Baseline handler: invoice exists, no prior payments, review automation on. */
function baseHandler(overrides = {}) {
  return (state) => {
    const key = `${state.table}.${state.op}`;
    if (overrides[key]) {
      const r = overrides[key](state);
      if (r !== undefined) return r;
    }
    switch (key) {
      case 'invoices.select':
        return { data: state.single ? { ...INVOICE } : [{ ...INVOICE }], error: null };
      case 'payments.select':
        return { data: [], error: null };
      case 'payments.insert':
        return { data: { id: 'pay-1' }, error: null };
      case 'companies.select':
        return { data: { ...COMPANY }, error: null };
      case 'customers.select':
        return { data: { ...CUSTOMER }, error: null };
      case 'invoice_items.select':
        return { data: [{ description: 'Drain cleaning', quantity: 1, unit_price: 200, total_price: 200 }], error: null };
      case 'jenny_pro_settings.select':
        return { data: null, error: null };
      case 'review_requests.select':
        return { data: [], error: null };
      case 'review_requests.insert':
        return { data: { id: 'rr-1' }, error: null };
      default:
        return { data: null, error: null };
    }
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRetrieve.mockResolvedValue({
    id: 'pi_1',
    payment_method: { id: 'pm_1', card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 } },
  });
});

describe('paymentLabel', () => {
  it('describes a card by brand and last4', () => {
    expect(paymentLabel('stripe', { brand: 'visa', last4: '4242' })).toBe('Visa ending in 4242');
    expect(paymentLabel('stripe', null)).toBe('Card');
    expect(paymentLabel('cash')).toBe('Cash');
  });
});

describe('recordInvoicePayment', () => {
  it('records the payment, flips the invoice to paid and marks leads won', async () => {
    const sb = createQueryMock(baseHandler());
    const r = await recordInvoicePayment(sb, { invoiceId: 'inv-1', amount: 200, paymentMethod: 'stripe', stripePaymentId: 'pi_1', card: { brand: 'visa', last4: '4242' } });

    expect(r.status).toBe('recorded');
    expect(r.paidInFull).toBe(true);
    expect(r.paymentId).toBe('pay-1');

    const insert = sb.calls.find((c) => c.table === 'payments' && c.op === 'insert');
    expect(insert.payload).toMatchObject({ invoice_id: 'inv-1', customer_id: 'cust-1', amount: 200, stripe_payment_id: 'pi_1', card_last4: '4242', status: 'completed' });

    const update = sb.calls.find((c) => c.table === 'invoices' && c.op === 'update');
    expect(update.payload).toMatchObject({ amount_paid: 200, status: 'paid', stripe_payment_intent_id: 'pi_1' });
    expect(update.payload.paid_at).toBeTruthy();

    const leads = sb.calls.find((c) => c.table === 'leads' && c.op === 'update');
    expect(leads.payload.status).toBe('won');
    expect(filterValue(leads, 'eq', 'customer_id')).toBe('cust-1');
  });

  it('marks a partial payment as partial and leaves leads alone', async () => {
    const sb = createQueryMock(baseHandler());
    const r = await recordInvoicePayment(sb, { invoiceId: 'inv-1', amount: 50, paymentMethod: 'stripe', stripePaymentId: 'pi_2' });
    expect(r.status).toBe('recorded');
    expect(r.paidInFull).toBe(false);
    const update = sb.calls.find((c) => c.table === 'invoices' && c.op === 'update');
    expect(update.payload).toMatchObject({ amount_paid: 50, status: 'partial', paid_at: null });
    expect(sb.calls.find((c) => c.table === 'leads')).toBeUndefined();
  });

  it('is idempotent: a payment already recorded for the Stripe id is a duplicate', async () => {
    const sb = createQueryMock(baseHandler({ 'payments.select': () => ({ data: [{ id: 'pay-existing' }], error: null }) }));
    const r = await recordInvoicePayment(sb, { invoiceId: 'inv-1', amount: 200, paymentMethod: 'stripe', stripePaymentId: 'pi_1' });
    expect(r.status).toBe('duplicate');
    expect(sb.calls.find((c) => c.table === 'payments' && c.op === 'insert')).toBeUndefined();
    expect(sb.calls.find((c) => c.table === 'invoices' && c.op === 'update')).toBeUndefined();
  });

  it('treats a unique violation on insert as a duplicate (webhook vs confirm race)', async () => {
    const sb = createQueryMock(baseHandler({ 'payments.insert': () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }) }));
    const r = await recordInvoicePayment(sb, { invoiceId: 'inv-1', amount: 200, paymentMethod: 'stripe', stripePaymentId: 'pi_1' });
    expect(r.status).toBe('duplicate');
    expect(sb.calls.find((c) => c.table === 'invoices' && c.op === 'update')).toBeUndefined();
  });

  it('retries without the new columns when the database has not run migration 054', async () => {
    let attempt = 0;
    const sb = createQueryMock(baseHandler({
      'payments.insert': (state) => {
        attempt++;
        if (attempt === 1) return { data: null, error: { code: '42703', message: 'column "customer_id" of relation "payments" does not exist' } };
        expect(state.payload.customer_id).toBeUndefined();
        return { data: { id: 'pay-legacy' }, error: null };
      },
    }));
    const r = await recordInvoicePayment(sb, { invoiceId: 'inv-1', amount: 200, paymentMethod: 'stripe', stripePaymentId: 'pi_1' });
    expect(attempt).toBe(2);
    expect(r.status).toBe('recorded');
    expect(r.paymentId).toBe('pay-legacy');
  });

  it('still flips the invoice when the payments insert fails for another reason', async () => {
    const sb = createQueryMock(baseHandler({ 'payments.insert': () => ({ data: null, error: { code: '42501', message: 'permission denied' } }) }));
    const r = await recordInvoicePayment(sb, { invoiceId: 'inv-1', amount: 200, paymentMethod: 'stripe', stripePaymentId: 'pi_1' });
    expect(r.status).toBe('recorded');
    expect(r.paymentId).toBeNull();
    expect(sb.calls.find((c) => c.table === 'invoices' && c.op === 'update').payload.status).toBe('paid');
  });

  it('returns not_found for an unknown invoice', async () => {
    const sb = createQueryMock(baseHandler({ 'invoices.select': () => ({ data: null, error: { message: 'no rows' } }) }));
    const r = await recordInvoicePayment(sb, { invoiceId: 'nope', amount: 1, paymentMethod: 'stripe' });
    expect(r.status).toBe('not_found');
  });
});

describe('runAfterPaymentHooks', () => {
  const paidInvoice = { ...INVOICE, amount_paid: 200, status: 'paid' };

  it('sends the receipt by email and SMS, stamps the payment, and queues the review', async () => {
    const sb = createQueryMock(baseHandler());
    const before = Date.now();
    const r = await runAfterPaymentHooks(sb, { invoice: paidInvoice, amount: 200, paidInFull: true, paymentId: 'pay-1', paymentMethod: 'stripe', card: { brand: 'visa', last4: '4242' } });

    expect(r.receipt).toEqual({ email: true, sms: true });
    expect(mockSendReceipt).toHaveBeenCalledTimes(1);
    const email = mockSendReceipt.mock.calls[0][0];
    expect(email).toMatchObject({ to: 'jane@example.com', companyName: 'Acme Plumbing', invoiceNumber: 'INV-100', amountPaid: 200, balanceDue: 0, kind: 'payment', paymentLabel: 'Visa ending in 4242' });
    expect(email.invoiceLink).toContain('/invoice/inv-1');
    expect(email.bookingLink).toContain('/book/co-1');

    expect(mockSendSMS).toHaveBeenCalledWith({ to: '5559876543', body: 'RECEIPT 200 INV-100' });

    const stamp = sb.calls.find((c) => c.table === 'payments' && c.op === 'update');
    expect(stamp.payload.receipt_channels).toEqual(['email', 'sms']);

    expect(r.reviewScheduled).toBe(true);
    const rr = sb.calls.find((c) => c.table === 'review_requests' && c.op === 'insert');
    expect(rr.payload).toMatchObject({ company_id: 'co-1', customer_id: 'cust-1', job_id: 'job-1', invoice_id: 'inv-1', status: 'pending', channel: 'sms', trigger: 'payment' });
    expect(rr.payload.tracking_token).toMatch(/^rv-/);
    const due = new Date(rr.payload.scheduled_for).getTime() - before;
    expect(due).toBeGreaterThanOrEqual(2 * 3600 * 1000 - 1000);
    expect(due).toBeLessThanOrEqual(2 * 3600 * 1000 + 5000);
  });

  it('does not text a customer without SMS consent', async () => {
    const sb = createQueryMock(baseHandler({ 'customers.select': () => ({ data: { ...CUSTOMER, sms_consent: false }, error: null }) }));
    const r = await runAfterPaymentHooks(sb, { invoice: paidInvoice, amount: 200, paidInFull: true, paymentId: 'pay-1', paymentMethod: 'stripe' });
    expect(r.receipt).toEqual({ email: true, sms: false });
    expect(mockSendSMS).not.toHaveBeenCalled();
    // Review still queued, by email since SMS is not consented
    expect(sb.calls.find((c) => c.table === 'review_requests' && c.op === 'insert').payload.channel).toBe('email');
  });

  it('sends a deposit receipt with the remaining balance and queues no review', async () => {
    const sb = createQueryMock(baseHandler());
    const depositInvoice = { ...INVOICE, amount_paid: 50, status: 'partial' };
    const r = await runAfterPaymentHooks(sb, { invoice: depositInvoice, amount: 50, paidInFull: false, paymentId: 'pay-1', paymentMethod: 'stripe', kind: 'deposit' });
    expect(mockSendReceipt.mock.calls[0][0]).toMatchObject({ kind: 'deposit', amountPaid: 50, balanceDue: 150 });
    expect(mockSendSMS).toHaveBeenCalledWith({ to: '5559876543', body: 'DEPOSIT 50 bal 150' });
    expect(r.reviewScheduled).toBe(false);
    expect(sb.calls.find((c) => c.table === 'review_requests')).toBeUndefined();
  });

  it('survives a failing email provider and still texts the receipt', async () => {
    mockSendReceipt.mockRejectedValueOnce(new Error('Resend down'));
    const sb = createQueryMock(baseHandler());
    const r = await runAfterPaymentHooks(sb, { invoice: paidInvoice, amount: 200, paidInFull: true, paymentId: 'pay-1', paymentMethod: 'stripe' });
    expect(r.receipt).toEqual({ email: false, sms: true });
  });
});

describe('scheduleReviewRequest', () => {
  it('respects the per-company review_followup_enabled toggle', async () => {
    const sb = createQueryMock(baseHandler({ 'jenny_pro_settings.select': () => ({ data: { review_followup_enabled: false }, error: null }) }));
    const r = await scheduleReviewRequest(sb, { companyId: 'co-1', customerId: 'cust-1', jobId: 'job-1', trigger: 'payment' });
    expect(r).toEqual({ scheduled: false, reason: 'disabled' });
    expect(sb.calls.find((c) => c.table === 'review_requests' && c.op === 'insert')).toBeUndefined();
  });

  it('does not queue twice for the same job / invoice / customer-week', async () => {
    const sb = createQueryMock(baseHandler({ 'review_requests.select': () => ({ data: [{ id: 'rr-old', job_id: 'job-1' }], error: null }) }));
    const r = await scheduleReviewRequest(sb, { companyId: 'co-1', customerId: 'cust-1', jobId: 'job-1', invoiceId: 'inv-1', trigger: 'payment' });
    expect(r.scheduled).toBe(false);
    expect(r.reason).toBe('already_requested');
    const dedupe = sb.calls.find((c) => c.table === 'review_requests' && c.op === 'select');
    const orClause = filterValue(dedupe, 'or');
    expect(orClause).toContain('job_id.eq.job-1');
    expect(orClause).toContain('invoice_id.eq.inv-1');
    expect(orClause).toContain('customer_id.eq.cust-1');
  });

  it('uses the company delay and counts it from the base time', async () => {
    const sb = createQueryMock(baseHandler({ 'companies.select': () => ({ data: { review_delay_hours: 24 }, error: null }) }));
    const base = new Date(Date.now() - 20 * 3600 * 1000); // completed 20h ago
    const r = await scheduleReviewRequest(sb, { companyId: 'co-1', customerId: 'cust-1', jobId: 'job-1', trigger: 'job_completed', baseTime: base.toISOString() });
    expect(r.scheduled).toBe(true);
    const delta = new Date(r.scheduledFor).getTime() - Date.now();
    expect(delta).toBeGreaterThan(3.9 * 3600 * 1000);
    expect(delta).toBeLessThan(4.1 * 3600 * 1000);
  });

  it('never schedules into the past when the delay already elapsed', async () => {
    const sb = createQueryMock(baseHandler());
    const base = new Date(Date.now() - 10 * 3600 * 1000);
    const r = await scheduleReviewRequest(sb, { companyId: 'co-1', customerId: 'cust-1', jobId: 'job-1', trigger: 'job_completed', baseTime: base.toISOString() });
    expect(new Date(r.scheduledFor).getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
  });

  it('skips customers with no consented channel', async () => {
    const sb = createQueryMock(baseHandler({ 'customers.select': () => ({ data: { name: 'X', phone: '555', email: null, sms_consent: false }, error: null }) }));
    const r = await scheduleReviewRequest(sb, { companyId: 'co-1', customerId: 'cust-1', trigger: 'payment' });
    expect(r).toEqual({ scheduled: false, reason: 'no_channel' });
  });
});

describe('processCheckoutSession', () => {
  const session = (extra = {}) => ({
    id: 'cs_1',
    payment_intent: 'pi_1',
    amount_total: 20000,
    customer: 'cus_1',
    payment_status: 'paid',
    metadata: { type: 'invoice_payment', invoice_id: 'inv-1', company_id: 'co-1', save_card: '0' },
    ...extra,
  });

  it('records an invoice payment with card details and runs the hooks', async () => {
    const sb = createQueryMock(baseHandler());
    const r = await processCheckoutSession(sb, session());
    expect(r.handled).toBe(true);
    expect(r.type).toBe('invoice_payment');
    expect(r.record.status).toBe('recorded');
    expect(mockRetrieve).toHaveBeenCalledWith('pi_1', { expand: ['payment_method'] });
    expect(sb.calls.find((c) => c.table === 'payments' && c.op === 'insert').payload).toMatchObject({ card_brand: 'visa', card_last4: '4242' });
    expect(r.hooks.receipt.email).toBe(true);
    expect(sb.calls.find((c) => c.table === 'customers' && c.op === 'update')).toBeUndefined();
  });

  it('saves the card on file when the customer opted in', async () => {
    const sb = createQueryMock(baseHandler());
    const r = await processCheckoutSession(sb, session({ metadata: { type: 'invoice_payment', invoice_id: 'inv-1', save_card: '1' } }));
    const cust = sb.calls.find((c) => c.table === 'customers' && c.op === 'update');
    expect(cust.payload).toMatchObject({ stripe_customer_id: 'cus_1', stripe_payment_method_id: 'pm_1', card_brand: 'visa', card_last4: '4242', card_exp_month: 12, card_exp_year: 2030 });
    expect(filterValue(cust, 'eq', 'id')).toBe('cust-1');
    expect(mockSendReceipt.mock.calls[0][0]).toMatchObject({ cardSaved: true, cardLast4: '4242' });
    expect(r.record.status).toBe('recorded');
  });

  it('is a no-op the second time the same session arrives', async () => {
    const sb = createQueryMock(baseHandler({ 'payments.select': () => ({ data: [{ id: 'pay-1' }], error: null }) }));
    const r = await processCheckoutSession(sb, session());
    expect(r.record.status).toBe('duplicate');
    expect(r.hooks).toBeUndefined();
    expect(mockSendReceipt).not.toHaveBeenCalled();
    expect(mockSendSMS).not.toHaveBeenCalled();
  });

  it('ignores sessions it does not own', async () => {
    const sb = createQueryMock(baseHandler());
    const r = await processCheckoutSession(sb, session({ metadata: { type: 'subscription' } }));
    expect(r.handled).toBe(false);
    expect(sb.calls).toHaveLength(0);
  });

  it('handles a quote deposit: marks the quote, creates the invoice, records the deposit, sends a deposit receipt', async () => {
    const quote = { id: 'q-1', company_id: 'co-1', customer_id: 'cust-1', subtotal: 200, tax_rate: 0, tax_amount: 0, discount_amount: 0, total: 200, items: [{ description: 'Job', quantity: 1, unit_price: 200, total_price: 200, sort_order: 0 }] };
    let invoiceCreated = false;
    const sb = createQueryMock(baseHandler({
      'quotes.update': () => ({ data: null, error: null }),
      'quotes.select': () => ({ data: quote, error: null }),
      'invoices.select': (state) => {
        if (filterValue(state, 'eq', 'quote_id') === 'q-1') return { data: [], error: null };
        if (state.opts?.head) return { data: null, count: 4, error: null };
        return invoiceCreated ? { data: { ...INVOICE, id: 'inv-new', quote_id: 'q-1' }, error: null } : { data: null, error: { message: 'missing' } };
      },
      'invoices.insert': (state) => {
        invoiceCreated = true;
        expect(state.payload).toMatchObject({ quote_id: 'q-1', amount_paid: 0, deposit_amount: 50, status: 'sent', total: 200 });
        expect(state.payload.invoice_number).toMatch(/^INV-\d{8}-0005$/);
        return { data: { id: 'inv-new' }, error: null };
      },
      'invoice_items.insert': (state) => {
        expect(state.payload[0]).toMatchObject({ invoice_id: 'inv-new', description: 'Job' });
        return { data: null, error: null };
      },
    }));

    const r = await processCheckoutSession(sb, session({ amount_total: 5000, metadata: { type: 'quote_deposit', quote_id: 'q-1', company_id: 'co-1', deposit_amount: '50' } }));
    expect(r.handled).toBe(true);
    expect(r.type).toBe('quote_deposit');
    expect(r.invoiceId).toBe('inv-new');
    expect(r.record.status).toBe('recorded');

    const quoteUpdate = sb.calls.find((c) => c.table === 'quotes' && c.op === 'update');
    expect(quoteUpdate.payload).toMatchObject({ deposit_paid: true, deposit_stripe_payment_id: 'pi_1' });

    const pay = sb.calls.find((c) => c.table === 'payments' && c.op === 'insert');
    expect(pay.payload).toMatchObject({ invoice_id: 'inv-new', amount: 50, notes: 'Quote deposit' });

    expect(mockSendReceipt.mock.calls[0][0]).toMatchObject({ kind: 'deposit', amountPaid: 50, balanceDue: 150 });
    expect(sb.calls.find((c) => c.table === 'review_requests' && c.op === 'insert')).toBeUndefined();
  });

  it('records a deposit against an invoice that already exists for the quote', async () => {
    const sb = createQueryMock(baseHandler({
      'invoices.select': (state) => {
        if (filterValue(state, 'eq', 'quote_id') === 'q-1') return { data: [{ id: 'inv-1' }], error: null };
        return undefined;
      },
    }));
    const r = await processCheckoutSession(sb, session({ amount_total: 5000, metadata: { type: 'quote_deposit', quote_id: 'q-1', deposit_amount: '50' } }));
    expect(r.invoiceId).toBe('inv-1');
    expect(sb.calls.find((c) => c.table === 'invoices' && c.op === 'insert')).toBeUndefined();
    expect(sb.calls.find((c) => c.table === 'payments' && c.op === 'insert').payload.amount).toBe(50);
  });
});

describe('chargeCardOnFile', () => {
  const stripe = { paymentIntents: { retrieve: mockRetrieve, create: mockPiCreate } };
  const invoiceWithCard = {
    ...INVOICE,
    customer: { id: 'cust-1', name: 'Jane Doe', stripe_customer_id: 'cus_1', stripe_payment_method_id: 'pm_1', card_brand: 'visa', card_last4: '4242' },
    company: { id: 'co-1', name: 'Acme Plumbing', stripe_connect_account_id: 'acct_1', stripe_connect_onboarded: true },
  };

  it('charges the balance off-session to the connected account and runs the pipeline', async () => {
    mockPiCreate.mockResolvedValue({ id: 'pi_cof', status: 'succeeded' });
    let first = true;
    const sb = createQueryMock(baseHandler({
      'invoices.select': () => {
        if (first) { first = false; return { data: invoiceWithCard, error: null }; }
        return undefined;
      },
    }));
    const r = await chargeCardOnFile(sb, stripe, { invoiceId: 'inv-1', companyId: 'co-1' });
    expect(r.ok).toBe(true);
    expect(mockPiCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: 20000,
      currency: 'usd',
      customer: 'cus_1',
      payment_method: 'pm_1',
      off_session: true,
      confirm: true,
      transfer_data: { destination: 'acct_1' },
      metadata: expect.objectContaining({ type: 'invoice_payment', invoice_id: 'inv-1', source: 'card_on_file' }),
    }));
    expect(sb.calls.find((c) => c.table === 'payments' && c.op === 'insert').payload).toMatchObject({ payment_method: 'card_on_file', stripe_payment_id: 'pi_cof', card_last4: '4242' });
    expect(r.hooks.receipt.email).toBe(true);
  });

  it('refuses when the customer has no card on file', async () => {
    const sb = createQueryMock(baseHandler({ 'invoices.select': () => ({ data: { ...invoiceWithCard, customer: { ...invoiceWithCard.customer, stripe_payment_method_id: null } }, error: null }) }));
    const r = await chargeCardOnFile(sb, stripe, { invoiceId: 'inv-1' });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
    expect(mockPiCreate).not.toHaveBeenCalled();
  });

  it('refuses an invoice from another company', async () => {
    const sb = createQueryMock(baseHandler({ 'invoices.select': () => ({ data: invoiceWithCard, error: null }) }));
    const r = await chargeCardOnFile(sb, stripe, { invoiceId: 'inv-1', companyId: 'co-other' });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(404);
  });

  it('surfaces a decline without recording anything', async () => {
    mockPiCreate.mockRejectedValue(Object.assign(new Error('Your card was declined.'), { code: 'card_declined', decline_code: 'insufficient_funds' }));
    const sb = createQueryMock(baseHandler({ 'invoices.select': () => ({ data: invoiceWithCard, error: null }) }));
    const r = await chargeCardOnFile(sb, stripe, { invoiceId: 'inv-1' });
    expect(r).toMatchObject({ ok: false, status: 402, code: 'card_declined', declineCode: 'insufficient_funds' });
    expect(sb.calls.find((c) => c.table === 'payments')).toBeUndefined();
    expect(mockSendReceipt).not.toHaveBeenCalled();
  });
});
