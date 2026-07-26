/**
 * @jest-environment node
 */

const { wireNumberToCompany } = require('@/lib/jenny-twilio-wire');

describe('wireNumberToCompany', () => {
  it('points webhooks at Jenny, attaches to the Messaging Service, and saves the mapping', async () => {
    const update = jest.fn().mockResolvedValue({});
    const incomingPhoneNumbers = jest.fn(() => ({ update }));
    const msCreate = jest.fn().mockResolvedValue({});
    const client = {
      incomingPhoneNumbers,
      messaging: { v1: { services: jest.fn(() => ({ phoneNumbers: { create: msCreate } })) } },
    };
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const supabase = { from: jest.fn(() => ({ upsert })) };

    const res = await wireNumberToCompany({
      client,
      supabase,
      companyId: 'c1',
      phoneNumberSid: 'PN1',
      phoneNumber: '+17657895752',
      baseUrl: 'https://www.taskiguana.com',
      messagingServiceSid: 'MG1',
    });

    expect(incomingPhoneNumbers).toHaveBeenCalledWith('PN1');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceUrl: 'https://www.taskiguana.com/api/jenny-pro/voice',
        smsUrl: 'https://www.taskiguana.com/api/jenny-pro/sms-webhook',
      })
    );
    expect(msCreate).toHaveBeenCalledWith({ phoneNumberSid: 'PN1' });
    expect(supabase.from).toHaveBeenCalledWith('company_phone_numbers');
    expect(upsert).toHaveBeenCalled();
    expect(res.attachedToCampaign).toBe(true);
  });

  it('still saves the mapping when no Messaging Service is configured', async () => {
    const update = jest.fn().mockResolvedValue({});
    const client = { incomingPhoneNumbers: jest.fn(() => ({ update })) };
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const supabase = { from: jest.fn(() => ({ upsert })) };

    const res = await wireNumberToCompany({
      client,
      supabase,
      companyId: 'c1',
      phoneNumberSid: 'PN1',
      phoneNumber: '+17657895752',
      baseUrl: 'https://x.com',
    });

    expect(upsert).toHaveBeenCalled();
    expect(res.attachedToCampaign).toBe(false);
  });
});
