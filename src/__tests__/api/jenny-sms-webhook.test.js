/**
 * @jest-environment node
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAiComplete = jest.fn();
jest.mock('@/lib/ai-client', () => ({
  aiComplete: (...args) => mockAiComplete(...args),
  parseAIJson: jest.requireActual('@/lib/ai-client').parseAIJson,
}));

jest.mock('@/lib/twilio', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'SM1' }),
}));

// Records every insert so tests can assert side effects.
let inserts = {};
let updates = {};
let existingConversation = null;
let settingsRow = { auto_booking: true, language: 'both', operator_language: 'en' };
// Quote-reply fixtures: the customer on file for the inbound number, and the
// open quote they were recently reminded about (null = none).
let customerRow = null;
let quoteInPlay = null;

function recordInsert(table, payload) {
  inserts[table] = inserts[table] || [];
  inserts[table].push(payload);
}

function recordUpdate(table, payload) {
  updates[table] = updates[table] || [];
  updates[table].push(payload);
}

function builder(table) {
  const obj = {};
  const passthrough = ['select', 'eq', 'neq', 'or', 'ilike', 'order', 'in', 'gte'];
  passthrough.forEach((m) => {
    obj[m] = jest.fn(() => obj);
  });
  obj.update = jest.fn((payload) => {
    recordUpdate(table, payload);
    return obj;
  });
  obj.insert = jest.fn((payload) => {
    recordInsert(table, payload);
    return obj;
  });
  obj.limit = jest.fn(() => obj);
  obj.maybeSingle = jest.fn(() => Promise.resolve(maybeSingleResult(table)));
  obj.single = jest.fn(() => Promise.resolve(singleResult(table)));
  // Awaiting the builder directly (e.g. jobs.select()...neq())
  obj.then = (resolve) => resolve(awaitResult(table));
  return obj;
}

function awaitResult(table) {
  if (table === 'companies') return { data: [{ id: 'comp-1' }], error: null };
  if (table === 'users') return { data: [{ id: 'user-1' }], error: null };
  if (table === 'jobs') return { data: [], error: null }; // availability check
  return { data: [], error: null };
}

function maybeSingleResult(table) {
  // The inbound Twilio number must be mapped to a tenant: there is no
  // "first company in the DB" fallback any more (it leaked calls cross-tenant).
  if (table === 'company_phone_numbers') return { data: { company_id: 'comp-1' } };
  if (table === 'companies') return { data: { id: 'comp-1', name: 'Green Co', business_type: 'landscaping' } };
  if (table === 'jenny_pro_settings') return { data: settingsRow };
  if (table === 'jenny_sms_conversations') return { data: existingConversation };
  if (table === 'customers') return { data: customerRow };
  if (table === 'quotes') return { data: quoteInPlay };
  return { data: null };
}

function singleResult(table) {
  if (table === 'jenny_sms_conversations') return { data: { id: 'conv-1' }, error: null };
  if (table === 'customers') return { data: { id: 'cust-1' }, error: null };
  if (table === 'jobs') return { data: { id: 'job-1' }, error: null };
  if (table === 'companies') return { data: { name: 'Green Co' }, error: null };
  return { data: null, error: null };
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: jest.fn((table) => builder(table)) })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.TWILIO_PHONE_NUMBER = '+15550001111';

const { POST } = require('@/app/api/jenny-pro/sms-webhook/route');

function smsRequest({ from = '+15559998888', body = 'hello', to = '+15550001111' } = {}) {
  const params = new URLSearchParams({ From: from, Body: body, To: to, MessageSid: 'SMtest' });
  return new Request('http://localhost/api/jenny-pro/sms-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
}

describe('/api/jenny-pro/sms-webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inserts = {};
    updates = {};
    existingConversation = null;
    customerRow = null;
    quoteInPlay = null;
    settingsRow = { auto_booking: true, language: 'both', operator_language: 'en' };
  });

  it('honors STOP without booking or AI', async () => {
    const res = await POST(smsRequest({ body: 'STOP' }));
    const xml = await res.text();
    expect(res.status).toBe(200);
    expect(xml).toBe('<Response></Response>');
    expect(mockAiComplete).not.toHaveBeenCalled();
    expect(inserts.jobs).toBeUndefined();
  });

  it('replies conversationally when not ready to book', async () => {
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({
        reply: 'Sure! What day works for you?',
        language: 'en',
        intent: 'booking',
        ready_to_book: false,
        booking: null,
      }),
    });

    const res = await POST(smsRequest({ body: 'I need lawn care' }));
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('<Message>');
    expect(xml).toContain('What day works for you');
    expect(inserts.jobs).toBeUndefined(); // no booking yet
  });

  it('auto-books when Jenny has all the details', async () => {
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({
        reply: "You're booked for Lawn Care on Thursday at 9 AM!",
        language: 'en',
        intent: 'booking',
        ready_to_book: true,
        booking: {
          customerName: 'Sarah',
          serviceName: 'Lawn Care',
          scheduledDate: '2026-07-02',
          scheduledTimeStart: '09:00',
          notes: 'half acre',
        },
      }),
    });

    const res = await POST(smsRequest({ body: 'Sarah, lawn care Thursday 9am' }));
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('booked for Lawn Care');
    // A job (booking) and a lead should have been created.
    expect(inserts.jobs && inserts.jobs.length).toBeGreaterThan(0);
    expect(inserts.leads && inserts.leads.length).toBeGreaterThan(0);
    // Operator notified in-app.
    expect(inserts.notifications && inserts.notifications.length).toBeGreaterThan(0);
  });

  it('escalates an emergency instead of booking', async () => {
    const res = await POST(smsRequest({ body: 'EMERGENCY there is a flood!' }));
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('<Message>');
    expect(mockAiComplete).not.toHaveBeenCalled();
    expect(inserts.jobs).toBeUndefined();
    // Operator gets an urgent notification.
    expect(inserts.notifications && inserts.notifications.length).toBeGreaterThan(0);
  });

  it('stays quiet and pings the owner while a human has taken over the thread', async () => {
    existingConversation = {
      id: 'conv-1',
      message_count: 4,
      language: 'en',
      customer_name: 'Maria',
      human_takeover_until: new Date(Date.now() + 3600_000).toISOString(),
    };

    const res = await POST(smsRequest({ body: 'Yes 3pm works for me' }));
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toBe('<Response></Response>'); // no AI reply
    expect(mockAiComplete).not.toHaveBeenCalled();
    // The inbound text is still logged so the owner sees it in the inbox...
    const inbound = (inserts.jenny_sms_messages || []).find((m) => m.direction === 'inbound');
    expect(inbound).toMatchObject({ sender: 'customer', body: 'Yes 3pm works for me' });
    // ...and the owner is notified in-app with a link into the inbox.
    expect(inserts.notifications && inserts.notifications.length).toBeGreaterThan(0);
    expect(inserts.notifications[0][0].link).toContain('tab=conversations');
  });

  it('resumes answering once the takeover window has lapsed', async () => {
    existingConversation = {
      id: 'conv-1',
      message_count: 4,
      language: 'en',
      human_takeover_until: new Date(Date.now() - 60_000).toISOString(),
    };
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({ reply: 'Great, what day?', language: 'en', intent: 'booking', ready_to_book: false, booking: null }),
    });

    const res = await POST(smsRequest({ body: 'hello again' }));
    const xml = await res.text();
    expect(xml).toContain('Great, what day?');
    expect(mockAiComplete).toHaveBeenCalled();
  });

  it('does not book when auto_booking is disabled', async () => {
    settingsRow = { auto_booking: false, language: 'both', operator_language: 'en' };
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({
        reply: 'Got it, let me check with the owner and confirm.',
        language: 'en',
        intent: 'booking',
        ready_to_book: true,
        booking: {
          customerName: 'Sarah',
          serviceName: 'Lawn Care',
          scheduledDate: '2026-07-02',
          scheduledTimeStart: '09:00',
        },
      }),
    });

    const res = await POST(smsRequest({ body: 'Sarah lawn care thursday 9am' }));
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml).toContain('<Message>');
    expect(inserts.jobs).toBeUndefined(); // auto_booking off → no job created
  });
});

// ── Replies to quote reminders ───────────────────────────────────────────────

describe('/api/jenny-pro/sms-webhook — quote reminder replies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inserts = {};
    updates = {};
    existingConversation = null;
    settingsRow = { auto_booking: true, language: 'both', operator_language: 'en', escalation_phone: '+15550009999' };
    customerRow = { id: 'cust-1', name: 'Jane Customer' };
    quoteInPlay = {
      id: '11111111-2222-4333-8444-555555555555', quote_number: 'Q-42', status: 'sent', total: 1250,
      reminder_count: 1, last_reminder_at: new Date(Date.now() - 2 * 86400000).toISOString(), customer_id: 'cust-1',
    };
  });

  const { sendSMS } = require('@/lib/twilio');

  it('accepts the quote when the customer replies yes, tells the owner, and skips the booking agent', async () => {
    const res = await POST(smsRequest({ body: 'Yes please' }));
    const xml = await res.text();
    expect(xml).toContain('Great news');
    expect(xml).toContain('Green Co');

    expect(updates.quotes).toEqual([expect.objectContaining({ status: 'approved', approved_at: expect.any(String) })]);
    expect(inserts.jenny_action_log).toEqual([expect.objectContaining({ action_type: 'quote_follow_up', status: 'executed' })]);
    expect(inserts.notifications.flat()).toEqual([expect.objectContaining({ type: 'quote_accepted', link: '/dashboard/quotes?status=approved' })]);
    expect(sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15550009999', body: expect.stringContaining('accepted quote Q-42') }));
    expect(mockAiComplete).not.toHaveBeenCalled();
  });

  it('declines the quote on a clear no', async () => {
    const res = await POST(smsRequest({ body: 'No thanks' }));
    expect(await res.text()).toContain('Understood');
    expect(updates.quotes).toEqual([expect.objectContaining({ status: 'rejected' })]);
    expect(inserts.notifications.flat()[0].title).toBe('Quote declined by text');
    expect(mockAiComplete).not.toHaveBeenCalled();
  });

  it('hands a question to the owner without changing the quote', async () => {
    const res = await POST(smsRequest({ body: 'Can you do it any cheaper?' }));
    expect(await res.text()).toContain('passed your message');
    expect(updates.quotes[0].status).toBeUndefined();
    expect(updates.quotes[0].follow_up_date).toEqual(expect.any(String));
    expect(inserts.notifications.flat()[0]).toMatchObject({ type: 'new_lead', link: '/dashboard/quotes?status=needs_follow_up' });
    expect(inserts.jenny_action_log[0]).toMatchObject({ status: 'pending' });
    expect(mockAiComplete).not.toHaveBeenCalled();
  });

  it('still records a yes during a human takeover but stays silent', async () => {
    existingConversation = { id: 'conv-1', message_count: 3, language: 'en', human_takeover_until: new Date(Date.now() + 3600000).toISOString() };
    const res = await POST(smsRequest({ body: 'yes' }));
    expect(await res.text()).not.toContain('Great news');
    expect(updates.quotes).toEqual([expect.objectContaining({ status: 'approved' })]);
    expect(inserts.notifications.flat()).toEqual([expect.objectContaining({ type: 'quote_accepted' })]);
  });

  it('treats a bare "yes" as the SMS opt-in it always was when there is no reminded quote', async () => {
    quoteInPlay = null;
    const res = await POST(smsRequest({ body: 'yes' }));
    expect(await res.text()).toContain('subscribed again');
    expect(updates.quotes).toBeUndefined();
    expect(mockAiComplete).not.toHaveBeenCalled();
  });

  it('falls through to the booking agent for other texts when there is no reminded quote', async () => {
    quoteInPlay = null;
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({ reply: 'Happy to help! What service do you need?', language: 'en', intent: 'inquiry', ready_to_book: false, booking: null }),
    });
    const res = await POST(smsRequest({ body: 'sounds good, what do you offer' }));
    expect(await res.text()).toContain('Happy to help');
    expect(updates.quotes).toBeUndefined();
    expect(mockAiComplete).toHaveBeenCalled();
  });

  it('answers in Spanish when the customer replies in Spanish', async () => {
    const res = await POST(smsRequest({ body: 'Sí, adelante' }));
    expect(await res.text()).toMatch(/Excelente/);
    expect(updates.quotes).toEqual([expect.objectContaining({ status: 'approved' })]);
  });
});
