/**
 * @jest-environment node
 */

/**
 * Tests for Jenny Pro SMS webhook handler
 * Validates inbound SMS processing, conversation tracking, and message logging
 */

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.TWILIO_PHONE_NUMBER = '+15551234567';

const { POST } = require('@/app/api/jenny-pro/sms-webhook/route');

function makeFormData(fields) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

function makeRequest(fields) {
  return {
    formData: () => Promise.resolve(makeFormData(fields)),
  };
}

describe('Jenny Pro SMS Webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock chain
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it('returns TwiML response for valid inbound SMS', async () => {
    // Mock companies lookup
    mockFrom.mockImplementation((table) => {
      if (table === 'companies') {
        return {
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ id: 'company-001' }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'jenny_sms_conversations') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: null, // No existing conversation
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'conv-001' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'customers') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              or: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'cust-001', name: 'John Doe' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'jenny_sms_messages') {
        return { insert: mockInsert };
      }
      return { select: jest.fn().mockReturnThis() };
    });

    const response = await POST(makeRequest({
      From: '+15559876543',
      Body: 'Hi, I need a quote for lawn mowing',
      MessageSid: 'SM123456',
      To: '+15551234567',
    }));

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('<Response>');
  });

  it('returns empty TwiML for messages without body', async () => {
    const response = await POST(makeRequest({
      From: '+15559876543',
      Body: '',
      To: '+15551234567',
    }));

    expect(response.status).toBe(200);
  });

  it('handles missing From field gracefully', async () => {
    const response = await POST(makeRequest({
      Body: 'test message',
      To: '+15551234567',
    }));

    expect(response.status).toBe(200);
  });

  it('returns TwiML content type', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }));

    const response = await POST(makeRequest({
      From: '+15559876543',
      Body: 'hello',
      To: '+15551234567',
    }));

    expect(response.headers.get('Content-Type')).toBe('text/xml');
  });
});
