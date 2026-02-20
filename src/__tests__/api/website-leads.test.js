/**
 * @jest-environment node
 */

/**
 * Tests for /api/website-builder/leads route
 * Validates lead submission, fallback behavior, and error handling
 */

const mockWebsiteLeadsInsert = jest.fn();
const mockCrmLeadsInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

const mockFrom = jest.fn((table) => {
  if (table === 'website_sites') {
    return { select: mockSelect };
  }
  if (table === 'website_leads') {
    return { insert: mockWebsiteLeadsInsert };
  }
  if (table === 'leads') {
    return { insert: mockCrmLeadsInsert };
  }
  return { insert: jest.fn().mockResolvedValue({ error: null }) };
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { POST } = require('@/app/api/website-builder/leads/route');

function makeRequest(body) {
  return new Request('http://localhost/api/website-builder/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_SITE = {
  id: '11111111-1111-1111-1111-111111111111',
  company_id: '22222222-2222-2222-2222-222222222222',
  user_id: '33333333-3333-3333-3333-333333333333',
  business_name: 'Test Plumbing Co',
};

function setupSiteLookup(site, error = null) {
  mockSingle.mockResolvedValue({ data: site, error });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
}

describe('/api/website-builder/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSiteLookup(VALID_SITE);
    mockWebsiteLeadsInsert.mockResolvedValue({ error: null });
    mockCrmLeadsInsert.mockResolvedValue({ error: null });
  });

  describe('validation', () => {
    it('returns 400 when siteId is missing', async () => {
      const request = makeRequest({ name: 'John' });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('siteId is required');
    });

    it('returns 400 when name is missing', async () => {
      const request = makeRequest({ siteId: VALID_SITE.id });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Name is required');
    });

    it('returns 400 when name is empty string', async () => {
      const request = makeRequest({ siteId: VALID_SITE.id, name: '   ' });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Name is required');
    });
  });

  describe('site lookup', () => {
    it('returns 404 when site is not found', async () => {
      setupSiteLookup(null, { message: 'Row not found' });

      const request = makeRequest({ siteId: 'bad-id', name: 'John' });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Site not found');
    });

    it('returns 404 when site data is null', async () => {
      setupSiteLookup(null);

      const request = makeRequest({ siteId: VALID_SITE.id, name: 'John' });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Site not found');
    });
  });

  describe('successful lead submission', () => {
    it('saves lead and returns success', async () => {
      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
        phone: '555-123-4567',
        email: 'john@example.com',
        message: 'I need my pipes fixed',
        service: 'Plumbing Repair',
        source: 'website_contact_form',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Thank you');
    });

    it('inserts into website_leads with correct fields', async () => {
      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: '  John Doe  ',
        phone: '555-123-4567',
        email: 'john@example.com',
        message: 'Fix my sink',
        service: 'Plumbing',
        source: 'website_contact_form',
      });

      await POST(request);

      expect(mockFrom).toHaveBeenCalledWith('website_leads');
      expect(mockWebsiteLeadsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          site_id: VALID_SITE.id,
          company_id: VALID_SITE.company_id,
          name: 'John Doe',
          phone: '555-123-4567',
          email: 'john@example.com',
          message: 'Fix my sink',
          service_requested: 'Plumbing',
          source: 'website_contact_form',
          status: 'new',
        })
      );
    });

    it('also inserts into CRM leads table', async () => {
      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
        email: 'john@example.com',
      });

      await POST(request);

      expect(mockFrom).toHaveBeenCalledWith('leads');
      expect(mockCrmLeadsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: VALID_SITE.company_id,
          name: 'John Doe',
          email: 'john@example.com',
          source: 'website',
          status: 'new',
        })
      );
    });

    it('handles optional fields as null', async () => {
      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
      });

      await POST(request);

      expect(mockWebsiteLeadsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: null,
          phone: null,
          message: null,
          service_requested: null,
        })
      );
    });

    it('defaults source to website_contact_form', async () => {
      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
      });

      await POST(request);

      expect(mockWebsiteLeadsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'website_contact_form',
        })
      );
    });
  });

  describe('null company_id handling', () => {
    it('saves lead even when site has no company_id', async () => {
      setupSiteLookup({ ...VALID_SITE, company_id: null });

      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
        email: 'john@example.com',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('does not include company_id in website_leads insert when null', async () => {
      setupSiteLookup({ ...VALID_SITE, company_id: null });

      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
      });

      await POST(request);

      const insertCall = mockWebsiteLeadsInsert.mock.calls[0][0];
      expect(insertCall).not.toHaveProperty('company_id');
    });

    it('skips CRM insert when company_id is null', async () => {
      setupSiteLookup({ ...VALID_SITE, company_id: null });

      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
      });

      await POST(request);

      expect(mockFrom).not.toHaveBeenCalledWith('leads');
    });
  });

  describe('fallback behavior', () => {
    it('succeeds via CRM table when website_leads table does not exist', async () => {
      mockWebsiteLeadsInsert.mockResolvedValueOnce({
        error: { message: 'relation "website_leads" does not exist', code: '42P01' },
      });

      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
        email: 'john@example.com',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockCrmLeadsInsert).toHaveBeenCalled();
    });

    it('succeeds via website_leads when CRM insert fails', async () => {
      mockCrmLeadsInsert.mockResolvedValueOnce({
        error: { message: 'column "service_requested" does not exist', code: '42703' },
      });

      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 500 only when BOTH inserts fail', async () => {
      mockWebsiteLeadsInsert.mockResolvedValueOnce({
        error: { message: 'relation "website_leads" does not exist', code: '42P01' },
      });
      mockCrmLeadsInsert.mockResolvedValueOnce({
        error: { message: 'relation "leads" does not exist', code: '42P01' },
      });

      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain('Failed to save lead');
    });
  });

  describe('CORS headers', () => {
    it('returns CORS headers on error responses', async () => {
      const request = makeRequest({});
      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('returns CORS headers on success responses', async () => {
      const request = makeRequest({
        siteId: VALID_SITE.id,
        name: 'John Doe',
      });

      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
