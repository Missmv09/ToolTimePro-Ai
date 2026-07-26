/**
 * @jest-environment node
 */

let mockExistingNumber = null;
let mockUpsertError = null;
const mockUpsert = jest.fn(() => Promise.resolve({ error: mockUpsertError }));

jest.mock('@/lib/server-auth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table) => {
      const obj = {};
      obj.select = () => obj;
      obj.eq = () => obj;
      obj.limit = () => obj;
      obj.single = () => Promise.resolve({ data: { company_id: 'comp-1' } });
      obj.maybeSingle = () =>
        Promise.resolve({
          data: table === 'company_phone_numbers' && mockExistingNumber
            ? { phone_number: mockExistingNumber }
            : null,
        });
      obj.upsert = mockUpsert;
      return obj;
    },
  })),
}));

const mockList = jest.fn().mockResolvedValue([{ phoneNumber: '+15550009999' }]);
const mockIncomingCreate = jest.fn().mockResolvedValue({ sid: 'PN1', phoneNumber: '+15550009999' });
const mockMsCreate = jest.fn().mockResolvedValue({});

jest.mock('twilio', () => {
  const fn = jest.fn(() => ({
    availablePhoneNumbers: jest.fn(() => ({ local: { list: mockList } })),
    incomingPhoneNumbers: { create: mockIncomingCreate },
    messaging: { v1: { services: jest.fn(() => ({ phoneNumbers: { create: mockMsCreate } })) } },
  }));
  return fn;
});

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.TWILIO_ACCOUNT_SID = 'ACtest';
process.env.TWILIO_AUTH_TOKEN = 'tok';
process.env.TWILIO_MESSAGING_SERVICE_SID = 'MGtest';
process.env.URL = 'https://www.taskiguana.com';

const { POST } = require('@/app/api/jenny-pro/provision-number/route');
const { authenticateRequest } = require('@/lib/server-auth');

function req(body = {}) {
  return new Request('http://localhost/api/jenny-pro/provision-number', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/jenny-pro/provision-number', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistingNumber = null;
    mockUpsertError = null;
    authenticateRequest.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('buys a number, wires its webhooks, and saves the mapping', async () => {
    const res = await POST(req({ _authToken: 't', areaCode: '209' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.phoneNumber).toBe('+15550009999');
    expect(data.attachedToCampaign).toBe(true);

    // Webhooks point at Jenny's routes.
    expect(mockIncomingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceUrl: 'https://www.taskiguana.com/api/jenny-pro/voice',
        smsUrl: 'https://www.taskiguana.com/api/jenny-pro/sms-webhook',
      })
    );
    // Attached to the A2P Messaging Service and mapping saved.
    expect(mockMsCreate).toHaveBeenCalledWith({ phoneNumberSid: 'PN1' });
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('is idempotent — returns the existing number without buying', async () => {
    mockExistingNumber = '+15551112222';
    const res = await POST(req({ _authToken: 't' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.phoneNumber).toBe('+15551112222');
    expect(data.alreadyProvisioned).toBe(true);
    expect(mockIncomingCreate).not.toHaveBeenCalled();
  });

  it('returns the auth error when unauthenticated', async () => {
    const { NextResponse } = require('next/server');
    authenticateRequest.mockResolvedValue({ error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) });

    const res = await POST(req({}));
    expect(res.status).toBe(401);
    expect(mockIncomingCreate).not.toHaveBeenCalled();
  });
});
