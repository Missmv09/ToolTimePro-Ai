/**
 * @jest-environment node
 */

/**
 * Tests for /api/quote/save route
 * Validates quote creation with auth, company ownership, and line item insertion.
 */

// ── Supabase mock ──────────────────────────────────────────────────────────────

const mockGetUser = jest.fn();
let tableHandlers = {};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: jest.fn((table) => {
      const handler = tableHandlers[table];
      if (handler) return handler();
      // default empty chain
      const obj = {};
      ['select', 'insert', 'update', 'eq', 'single', 'order'].forEach((m) => {
        obj[m] = jest.fn(() => obj);
      });
      obj.single = jest.fn(() => ({ data: null, error: null }));
      return obj;
    }),
  })),
}));

// ── Env vars ───────────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// ── Import route AFTER mocks ───────────────────────────────────────────────────

const { POST } = require('@/app/api/quote/save/route');

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body, token = 'valid-token') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return new Request('http://localhost/api/quote/save', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const validQuoteData = {
  company_id: 'company-1',
  customer_id: 'cust-1',
  quote_number: 'QT-2026-001',
  status: 'draft',
  subtotal: 280,
  tax_rate: 8.25,
  tax_amount: 23.10,
  total: 303.10,
  valid_until: '2026-05-01',
  notes: 'Test quote',
};

const validItems = [
  { description: 'Lawn mowing', quantity: 1, unit_price: 45, total_price: 45, sort_order: 0 },
  { description: 'Hedge trimming', quantity: 2, unit_price: 65, total_price: 130, sort_order: 1 },
];

function setupHandlers({ userId = 'user-1', companyId = 'company-1', role = 'owner', quoteInsertError = null } = {}) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });

  tableHandlers = {};

  // users table
  tableHandlers['users'] = () => {
    const obj = {};
    obj.select = jest.fn(() => obj);
    obj.eq = jest.fn(() => obj);
    obj.single = jest.fn(() => ({
      data: { id: userId, role, company_id: companyId },
      error: null,
    }));
    return obj;
  };

  // quotes table
  tableHandlers['quotes'] = () => {
    const obj = {};
    obj.insert = jest.fn(() => obj);
    obj.select = jest.fn(() => obj);
    obj.single = jest.fn(() => {
      if (quoteInsertError) {
        return { data: null, error: quoteInsertError };
      }
      return {
        data: { id: 'quote-1', ...validQuoteData },
        error: null,
      };
    });
    return obj;
  };

  // quote_items table
  tableHandlers['quote_items'] = () => {
    const obj = {};
    obj.insert = jest.fn(() => ({ data: null, error: null }));
    return obj;
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('/api/quote/save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlers();
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when no Authorization header is present', async () => {
    const request = makeRequest({ quoteData: validQuoteData, items: validItems }, null);
    // Remove auth header entirely
    const noAuthRequest = new Request('http://localhost/api/quote/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteData: validQuoteData, items: validItems }),
    });
    const response = await POST(noAuthRequest);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const request = makeRequest({ quoteData: validQuoteData, items: validItems });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when quoteData is missing', async () => {
    const request = makeRequest({ items: validItems });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing required quote data');
  });

  it('returns 400 when company_id is missing from quoteData', async () => {
    const { company_id, ...noCompany } = validQuoteData;
    const request = makeRequest({ quoteData: noCompany, items: validItems });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  // ── Company mismatch ──────────────────────────────────────────────────────

  it('returns 403 when quote company_id does not match user company', async () => {
    setupHandlers({ companyId: 'different-company' });

    const request = makeRequest({ quoteData: validQuoteData, items: validItems });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Company mismatch');
  });

  // ── Successful quote creation ─────────────────────────────────────────────

  it('creates a quote with line items successfully', async () => {
    const request = makeRequest({ quoteData: validQuoteData, items: validItems });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.quote).toBeDefined();
    expect(body.quote.id).toBe('quote-1');
  });

  it('creates a quote without line items', async () => {
    const request = makeRequest({ quoteData: validQuoteData, items: [] });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  // ── User profile not found ────────────────────────────────────────────────

  it('returns 403 when user profile is not found', async () => {
    tableHandlers['users'] = () => {
      const obj = {};
      obj.select = jest.fn(() => obj);
      obj.eq = jest.fn(() => obj);
      obj.single = jest.fn(() => ({
        data: null,
        error: null,
      }));
      return obj;
    };

    const request = makeRequest({ quoteData: validQuoteData, items: validItems });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('User profile not found');
  });
});
