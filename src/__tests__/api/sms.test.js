/**
 * @jest-environment node
 */

/**
 * Tests for /api/sms route
 * Validates SMS sending, templates, phone formatting, and error handling
 */

const mockMessageCreate = jest.fn();

jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: { create: mockMessageCreate },
  }));
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnValue({
        catch: jest.fn(),
      }),
    })),
  })),
}));

process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
process.env.TWILIO_AUTH_TOKEN = 'test_token';
process.env.TWILIO_PHONE_NUMBER = '+15555555555';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

const { POST, GET } = require('@/app/api/sms/route');

function makePostRequest(body) {
  return new Request('http://localhost/api/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/sms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageCreate.mockResolvedValue({ sid: 'SM123', status: 'sent' });
  });

  describe('POST - Send SMS', () => {
    it('sends a booking confirmation SMS', async () => {
      const request = makePostRequest({
        to: '5551234567',
        template: 'booking_confirmation',
        data: {
          customerName: 'John',
          serviceName: 'Lawn Care',
          companyName: 'GreenCo',
          date: '2024-03-15',
          time: '10:00 AM',
        },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.messageId).toBe('SM123');
      expect(mockMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15551234567',
          from: '+15555555555',
          body: expect.stringContaining('John'),
        })
      );
    });

    it('sends a custom message', async () => {
      const request = makePostRequest({
        to: '5551234567',
        customMessage: 'Hello from ToolTimePro!',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Hello from ToolTimePro!',
        })
      );
    });

    it('returns 400 when no phone number provided', async () => {
      const request = makePostRequest({ template: 'booking_confirmation' });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Phone number required');
    });

    it('returns 400 when no template or custom message', async () => {
      const request = makePostRequest({ to: '5551234567' });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Template or customMessage required');
    });

    it('returns 400 for unknown template', async () => {
      const request = makePostRequest({
        to: '5551234567',
        template: 'nonexistent_template',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Unknown template');
    });

    it('formats 10-digit phone to E.164', async () => {
      const request = makePostRequest({
        to: '7651234567',
        customMessage: 'test',
      });
      await POST(request);

      expect(mockMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+17651234567' })
      );
    });

    it('formats 11-digit phone starting with 1', async () => {
      const request = makePostRequest({
        to: '17651234567',
        customMessage: 'test',
      });
      await POST(request);

      expect(mockMessageCreate).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+17651234567' })
      );
    });

    it('handles Twilio invalid number error', async () => {
      const error = new Error('Invalid number');
      error.code = 21211;
      mockMessageCreate.mockRejectedValue(error);

      const request = makePostRequest({
        to: '000',
        customMessage: 'test',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid phone number format');
    });
  });

  describe('GET - Configuration status', () => {
    it('returns configured status and template list', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.configured).toBe(true);
      expect(body.templates).toContain('booking_confirmation');
      expect(body.templates).toContain('booking_reminder');
      expect(body.templates).toContain('quote_sent');
      expect(body.templates).toContain('invoice_sent');
      expect(body.templates).toContain('custom');
    });
  });
});
