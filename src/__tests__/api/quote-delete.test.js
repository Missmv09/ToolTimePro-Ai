/**
 * @jest-environment node
 */

/**
 * Tests for /api/quote/delete route
 * Validates permission enforcement, status checks, and cascade deletion
 */

// ---- Mock Supabase ----

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Set env vars before import
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key';

const { POST } = require('@/app/api/quote/delete/route');

// ---- Helpers ----

function makeRequest(body, token = 'valid-token') {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return new Request('http://localhost/api/quote/delete', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function makeUnauthRequest(body) {
  return new Request('http://localhost/api/quote/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Chain builder for Supabase query mocking
function mockQuery(returnValue) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(returnValue),
  };
  return chain;
}

function setupMocks({ user, profile, quote, invoiceCount = 0, deleteError = null }) {
  // Auth
  mockGetUser.mockResolvedValue(
    user
      ? { data: { user }, error: null }
      : { data: { user: null }, error: { message: 'Invalid token' } }
  );

  // Build per-table mocks
  const usersChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: profile, error: profile ? null : { message: 'Not found' } }),
  };

  const quotesSelectChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: quote, error: quote ? null : { message: 'Not found' } }),
  };

  // Supabase with { count: 'exact', head: true } resolves at .eq() with { count }
  const invoicesChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ count: invoiceCount }),
  };

  const quoteItemsDeleteChain = {
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  };

  const quotesDeleteChain = {
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: deleteError }),
  };

  // Track call order to differentiate between select and delete calls to 'quotes'
  let quotesCallCount = 0;

  mockFrom.mockImplementation((table) => {
    if (table === 'users') return usersChain;
    if (table === 'invoices') return invoicesChain;
    if (table === 'quote_items') return quoteItemsDeleteChain;
    if (table === 'quotes') {
      quotesCallCount++;
      // First call is the SELECT to fetch the quote; second is the DELETE
      if (quotesCallCount === 1) return quotesSelectChain;
      return quotesDeleteChain;
    }
    return mockQuery({ data: null, error: null });
  });

  return { usersChain, quotesSelectChain, invoicesChain, quoteItemsDeleteChain, quotesDeleteChain };
}

// ---- Fixtures ----

const OWNER_USER = { id: 'user-owner-1' };
const WORKER_USER = { id: 'user-worker-1' };
const OTHER_WORKER_USER = { id: 'user-worker-2' };

const OWNER_PROFILE = { role: 'owner', company_id: 'company-1' };
const ADMIN_PROFILE = { role: 'admin', company_id: 'company-1' };
const WORKER_PROFILE = { role: 'worker', company_id: 'company-1' };
const OTHER_COMPANY_PROFILE = { role: 'owner', company_id: 'company-2' };

function draftQuote(createdBy = 'user-owner-1') {
  return { id: 'quote-1', status: 'draft', company_id: 'company-1', created_by: createdBy };
}

function pendingQuote(createdBy = 'user-worker-1') {
  return { id: 'quote-2', status: 'pending_approval', company_id: 'company-1', created_by: createdBy };
}

function sentQuote() {
  return { id: 'quote-3', status: 'sent', company_id: 'company-1', created_by: 'user-owner-1' };
}

// ====================================================================
// TESTS
// ====================================================================

describe('/api/quote/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Auth & Validation ----

  describe('Authentication & validation', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const request = makeUnauthRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when token is invalid', async () => {
      setupMocks({ user: null, profile: null, quote: null });
      const request = makeRequest({ quoteId: 'quote-1' }, 'bad-token');
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 400 when quoteId is missing', async () => {
      const request = makeRequest({});
      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/quoteId/i);
    });
  });

  // ---- Owner/Admin permissions ----

  describe('Owner/Admin can delete', () => {
    it('owner can delete a draft quote', async () => {
      setupMocks({ user: OWNER_USER, profile: OWNER_PROFILE, quote: draftQuote() });
      const request = makeRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('owner can delete a pending_approval quote', async () => {
      setupMocks({ user: OWNER_USER, profile: OWNER_PROFILE, quote: pendingQuote() });
      const request = makeRequest({ quoteId: 'quote-2' });
      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('admin can delete a draft quote', async () => {
      setupMocks({ user: OWNER_USER, profile: ADMIN_PROFILE, quote: draftQuote() });
      const request = makeRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('admin can delete a pending_approval quote', async () => {
      setupMocks({ user: OWNER_USER, profile: ADMIN_PROFILE, quote: pendingQuote() });
      const request = makeRequest({ quoteId: 'quote-2' });
      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('owner cannot delete a sent quote', async () => {
      setupMocks({ user: OWNER_USER, profile: OWNER_PROFILE, quote: sentQuote() });
      const request = makeRequest({ quoteId: 'quote-3' });
      const response = await POST(request);
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toMatch(/sent/i);
    });
  });

  // ---- Worker permissions ----

  describe('Worker permissions', () => {
    it('worker can delete their own draft quote', async () => {
      setupMocks({
        user: WORKER_USER,
        profile: WORKER_PROFILE,
        quote: draftQuote('user-worker-1'),
      });
      const request = makeRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('worker cannot delete another worker\'s draft quote', async () => {
      setupMocks({
        user: WORKER_USER,
        profile: WORKER_PROFILE,
        quote: draftQuote('user-worker-2'),
      });
      const request = makeRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/you created/i);
    });

    it('worker cannot delete their own pending_approval quote', async () => {
      setupMocks({
        user: WORKER_USER,
        profile: WORKER_PROFILE,
        quote: pendingQuote('user-worker-1'),
      });
      const request = makeRequest({ quoteId: 'quote-2' });
      const response = await POST(request);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/draft/i);
    });

    it('worker cannot delete a sent quote', async () => {
      setupMocks({
        user: WORKER_USER,
        profile: WORKER_PROFILE,
        quote: sentQuote(),
      });
      const request = makeRequest({ quoteId: 'quote-3' });
      const response = await POST(request);
      expect(response.status).toBe(409);
    });
  });

  // ---- Cross-company isolation ----

  describe('Company isolation', () => {
    it('returns 404 when quote belongs to a different company', async () => {
      setupMocks({
        user: OWNER_USER,
        profile: OTHER_COMPANY_PROFILE,
        quote: draftQuote(),
      });
      const request = makeRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  // ---- Invoice protection ----

  describe('Invoice protection', () => {
    it('returns 409 when quote has an associated invoice', async () => {
      setupMocks({
        user: OWNER_USER,
        profile: OWNER_PROFILE,
        quote: draftQuote(),
        invoiceCount: 1,
      });
      const request = makeRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toMatch(/invoice/i);
    });
  });

  // ---- Status enforcement ----

  describe('Status enforcement', () => {
    it.each(['sent', 'viewed', 'approved', 'rejected'])(
      'returns 409 for status "%s"',
      async (status) => {
        const quote = { id: 'quote-x', status, company_id: 'company-1', created_by: 'user-owner-1' };
        setupMocks({ user: OWNER_USER, profile: OWNER_PROFILE, quote });
        const request = makeRequest({ quoteId: 'quote-x' });
        const response = await POST(request);
        expect(response.status).toBe(409);
      }
    );
  });

  // ---- Cascade deletion ----

  describe('Cascade deletion', () => {
    it('deletes quote_items before deleting the quote', async () => {
      const mocks = setupMocks({
        user: OWNER_USER,
        profile: OWNER_PROFILE,
        quote: draftQuote(),
      });
      const request = makeRequest({ quoteId: 'quote-1' });
      await POST(request);

      // quote_items delete should have been called
      expect(mockFrom).toHaveBeenCalledWith('quote_items');
      // quotes should be called at least twice (select + delete)
      const quotesCalls = mockFrom.mock.calls.filter(([t]) => t === 'quotes');
      expect(quotesCalls.length).toBe(2);
    });
  });

  // ---- Error handling ----

  describe('Error handling', () => {
    it('returns 404 when quote does not exist', async () => {
      setupMocks({ user: OWNER_USER, profile: OWNER_PROFILE, quote: null });
      const request = makeRequest({ quoteId: 'nonexistent' });
      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('returns 403 when user profile not found', async () => {
      setupMocks({ user: OWNER_USER, profile: null, quote: draftQuote() });
      const request = makeRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 500 when delete operation fails', async () => {
      setupMocks({
        user: OWNER_USER,
        profile: OWNER_PROFILE,
        quote: draftQuote(),
        deleteError: { message: 'DB error' },
      });
      const request = makeRequest({ quoteId: 'quote-1' });
      const response = await POST(request);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toMatch(/failed/i);
    });
  });
});
