/**
 * @jest-environment node
 */

/**
 * Tests for /api/bookings route
 * Validates the full customer booking flow: availability check, customer creation,
 * job creation, lead creation, and SMS notification.
 */

// ── Supabase mock ──────────────────────────────────────────────────────────────

const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockNeq = jest.fn();
const mockSingle = jest.fn();

// Build a chainable query builder that records every call
function chainable(terminal) {
  const chain = {};
  const methods = ['from', 'insert', 'select', 'update', 'eq', 'neq', 'single', 'order'];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => (m === 'single' ? terminal() : chain));
  });
  return chain;
}

// We need fine-grained control per-table, so we track calls by table name.
let tableHandlers = {};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => {
      const handler = tableHandlers[table];
      if (handler) return handler(table);
      // default: return a chainable that resolves to empty
      const c = chainable(() => ({ data: null, error: null }));
      return c;
    }),
  })),
}));

// ── Twilio mock ────────────────────────────────────────────────────────────────

jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'SM_test_123' }),
    },
  }));
});

// ── Env vars ───────────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.TWILIO_ACCOUNT_SID = 'AC_test';
process.env.TWILIO_AUTH_TOKEN = 'test_token';
process.env.TWILIO_PHONE_NUMBER = '+15550001111';

// ── Import route AFTER mocks ───────────────────────────────────────────────────

const { POST } = require('@/app/api/bookings/route');

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body) {
  return new Request('http://localhost/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBooking = {
  companyId: 'company-1',
  serviceId: 'service-1',
  serviceName: 'Lawn Mowing',
  scheduledDate: '2026-04-15',
  scheduledTimeStart: '10:00',
  durationMinutes: 60,
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  customerPhone: '5551234567',
  customerAddress: '123 Main St',
  customerCity: 'Sacramento',
  customerState: 'CA',
  customerZip: '95814',
  notes: 'Please use the side gate',
};

// ── Helpers for setting up table-level mocks ───────────────────────────────────

function setupDefaultHandlers({ existingJobs = [], existingCustomer = null, newCustomerId = 'cust-1', newJobId = 'job-1', companyName = 'Test Co' } = {}) {
  tableHandlers = {};

  // jobs table – used for availability check AND insert
  let jobCallCount = 0;
  tableHandlers['jobs'] = () => {
    jobCallCount++;
    const obj = {};
    obj.select = jest.fn(() => obj);
    obj.insert = jest.fn(() => obj);
    obj.eq = jest.fn(() => obj);
    obj.neq = jest.fn(() => obj);
    obj.single = jest.fn(() => {
      // insert path returns the created job
      return { data: { id: newJobId, ...validBooking }, error: null };
    });

    // For the first call (availability check), we resolve the chain differently.
    // The availability check does: from('jobs').select(...).eq(...).eq(...).neq(...)
    // It does NOT call .single(), so we need the final .neq() to resolve.
    if (jobCallCount === 1) {
      // availability check — resolve at neq
      obj.neq = jest.fn(() => ({
        data: existingJobs,
        error: null,
      }));
    }

    return obj;
  };

  // customers table
  tableHandlers['customers'] = () => {
    const obj = {};
    obj.select = jest.fn(() => obj);
    obj.insert = jest.fn(() => obj);
    obj.update = jest.fn(() => obj);
    obj.eq = jest.fn(() => obj);
    obj.single = jest.fn(() => {
      if (existingCustomer) {
        return { data: existingCustomer, error: null };
      }
      // If insert path, return new id
      return { data: { id: newCustomerId }, error: null };
    });
    return obj;
  };

  // leads table
  tableHandlers['leads'] = () => {
    const obj = {};
    obj.insert = jest.fn(() => ({
      data: null,
      error: null,
    }));
    return obj;
  };

  // companies table
  tableHandlers['companies'] = () => {
    const obj = {};
    obj.select = jest.fn(() => obj);
    obj.eq = jest.fn(() => obj);
    obj.single = jest.fn(() => ({
      data: { name: companyName },
      error: null,
    }));
    return obj;
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('/api/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultHandlers();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when required fields are missing', async () => {
    const request = makeRequest({ companyId: 'c1' }); // missing most fields
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing required fields');
  });

  it('returns 400 when customerPhone is missing', async () => {
    const { customerPhone, ...noPhone } = validBooking;
    const request = makeRequest(noPhone);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing required fields');
  });

  // ── Successful booking ────────────────────────────────────────────────────

  it('creates a booking successfully with all records', async () => {
    const request = makeRequest(validBooking);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.booking).toBeDefined();
    expect(body.booking.service).toBe('Lawn Mowing');
    expect(body.booking.date).toBe('2026-04-15');
    expect(body.booking.time).toBe('10:00');
    expect(body.booking.customer).toBe('Jane Doe');
    expect(body.leadCreated).toBe(true);
  });

  it('reports SMS status in the response', async () => {
    const request = makeRequest({ ...validBooking, smsConsent: true });
    const response = await POST(request);
    const body = await response.json();

    // Twilio is mocked and configured, so SMS should be sent
    expect(body.smsStatus).toBe('sent');
  });

  // ── Slot conflict (web booking) ───────────────────────────────────────────

  it('returns 409 when the requested slot is already booked (web booking)', async () => {
    setupDefaultHandlers({
      existingJobs: [{ scheduled_time_start: '10:00' }],
    });

    const request = makeRequest(validBooking);
    const response = await POST(request);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('no longer available');
  });

  // ── Slot conflict (chatbot booking – auto-advance) ────────────────────────

  it('auto-advances to next open slot for chatbot bookings', async () => {
    setupDefaultHandlers({
      existingJobs: [{ scheduled_time_start: '10:00' }],
    });

    const chatbotBooking = {
      ...validBooking,
      notes: 'booked via Jenny AI chat',
    };

    const request = makeRequest(chatbotBooking);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // Should advance past the booked 10:00 slot
    expect(body.booking.time).not.toBe('10:00');
  });

  // ── Existing customer update ──────────────────────────────────────────────

  it('reuses existing customer record when email matches', async () => {
    setupDefaultHandlers({
      existingCustomer: { id: 'existing-cust-99' },
    });

    const request = makeRequest(validBooking);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  // ── Booking without optional fields ───────────────────────────────────────

  it('creates a booking without optional email and address fields', async () => {
    const minimalBooking = {
      companyId: 'company-1',
      serviceName: 'Lawn Mowing',
      scheduledDate: '2026-04-15',
      scheduledTimeStart: '10:00',
      customerName: 'Jane Doe',
      customerPhone: '5551234567',
    };

    const request = makeRequest(minimalBooking);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  // ── Default duration ──────────────────────────────────────────────────────

  it('defaults to 60 minutes when durationMinutes is not provided', async () => {
    const { durationMinutes, ...noDuration } = validBooking;
    const request = makeRequest(noDuration);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
