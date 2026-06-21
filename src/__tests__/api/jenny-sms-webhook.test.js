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
let existingConversation = null;
let settingsRow = { auto_booking: true, language: 'both', operator_language: 'en' };

function recordInsert(table, payload) {
  inserts[table] = inserts[table] || [];
  inserts[table].push(payload);
}

function builder(table) {
  const obj = {};
  const passthrough = ['select', 'eq', 'neq', 'or', 'ilike', 'order', 'update'];
  passthrough.forEach((m) => {
    obj[m] = jest.fn(() => obj);
  });
  obj.insert = jest.fn((payload) => {
    recordInsert(table, payload);
    return obj;
  });
  obj.limit = jest.fn(() => obj);
  obj.maybeSingle = jest.fn(() => Promise.resolve(maybeSingleResult(table)));
  obj.single = jest.fn(() => Promise.resolve(singleResult(table)));
  // Awaiting the builder directly (e.g. companies.select().limit(1))
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
  if (table === 'jenny_pro_settings') return { data: settingsRow };
  if (table === 'jenny_sms_conversations') return { data: existingConversation };
  if (table === 'customers') return { data: null };
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
    existingConversation = null;
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
