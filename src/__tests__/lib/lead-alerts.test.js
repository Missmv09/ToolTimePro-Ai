/**
 * @jest-environment node
 */

const mockNotifyInApp = jest.fn().mockResolvedValue(undefined);
const mockNotifySMS = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/jenny-notify', () => ({
  notifyOperatorInApp: (...a) => mockNotifyInApp(...a),
  notifyOperatorSMS: (...a) => mockNotifySMS(...a),
}));

const mockSendSMS = jest.fn();
jest.mock('@/lib/twilio', () => ({
  sendSMS: (...a) => mockSendSMS(...a),
}));

const { notifyNewLead, buildLeadAlertText, buildLeadAutoReply } = require('@/lib/lead-alerts');

// ── Fake Supabase ────────────────────────────────────────────────────────────
let settingsRow;
let inserts;

function builder(table) {
  const obj = {};
  ['select', 'eq', 'order', 'limit'].forEach((m) => {
    obj[m] = jest.fn(() => obj);
  });
  obj.insert = jest.fn((payload) => {
    inserts.push({ table, payload });
    return obj;
  });
  obj.maybeSingle = jest.fn(() => {
    if (table === 'jenny_pro_settings') return Promise.resolve({ data: settingsRow });
    if (table === 'companies') return Promise.resolve({ data: { id: 'comp-1', name: 'Green Co' } });
    return Promise.resolve({ data: null });
  });
  obj.single = jest.fn(() => Promise.resolve({ data: { id: 'conv-1' }, error: null }));
  obj.then = (resolve) => resolve({ data: null, error: null });
  return obj;
}

const supabase = { from: jest.fn((table) => builder(table)) };

const LEAD = {
  id: 'lead-1',
  name: 'Sarah Connor',
  phone: '+15550001234',
  email: 'sarah@example.com',
  service_requested: 'Fence repair',
  message: 'Back gate is falling off',
};

describe('lead-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inserts = [];
    settingsRow = null;
    mockSendSMS.mockResolvedValue({ success: true, messageId: 'SM9' });
  });

  it('alerts in-app by default even when Jenny Pro settings do not exist', async () => {
    const r = await notifyNewLead(supabase, { companyId: 'comp-1', lead: LEAD });
    expect(r.alerted).toBe(true);
    expect(mockNotifyInApp).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ companyId: 'comp-1', type: 'new_lead', link: '/dashboard/leads' })
    );
    // No escalation number known → no SMS, no auto-reply.
    expect(mockNotifySMS).not.toHaveBeenCalled();
    expect(mockSendSMS).not.toHaveBeenCalled();
    expect(r.autoReplied).toBe(false);
  });

  it('texts the escalation number when one is configured', async () => {
    settingsRow = { lead_alerts_enabled: true, escalation_phone: '+15557778888', operator_language: 'en' };
    const r = await notifyNewLead(supabase, { companyId: 'comp-1', lead: LEAD });
    expect(r.smsAlerted).toBe(true);
    expect(mockNotifySMS).toHaveBeenCalledWith('+15557778888', expect.stringContaining('Sarah Connor'));
    expect(mockNotifySMS.mock.calls[0][1]).toContain('Fence repair');
  });

  it('stays silent when the owner turned lead alerts off', async () => {
    settingsRow = { lead_alerts_enabled: false, escalation_phone: '+15557778888' };
    const r = await notifyNewLead(supabase, { companyId: 'comp-1', lead: LEAD });
    expect(r.alerted).toBe(false);
    expect(mockNotifyInApp).not.toHaveBeenCalled();
    expect(mockNotifySMS).not.toHaveBeenCalled();
  });

  it('texts the lead back and opens a Jenny thread when auto-reply is on', async () => {
    settingsRow = { lead_alerts_enabled: true, lead_auto_reply_enabled: true, language: 'both' };
    const r = await notifyNewLead(supabase, { companyId: 'comp-1', lead: LEAD });

    expect(r.autoReplied).toBe(true);
    expect(mockSendSMS).toHaveBeenCalledWith({ to: '+15550001234', body: expect.stringContaining('Hi Sarah!') });
    expect(mockSendSMS.mock.calls[0][0].body).toContain('Green Co');
    expect(mockSendSMS.mock.calls[0][0].body).toContain('STOP');

    const conv = inserts.find((i) => i.table === 'jenny_sms_conversations');
    expect(conv.payload).toMatchObject({
      company_id: 'comp-1',
      customer_phone: '+15550001234',
      customer_name: 'Sarah Connor',
      lead_id: 'lead-1',
      source: 'web_lead',
      status: 'active',
    });
    const msg = inserts.find((i) => i.table === 'jenny_sms_messages');
    expect(msg.payload).toMatchObject({ conversation_id: 'conv-1', direction: 'outbound', sender: 'jenny', twilio_sid: 'SM9' });
  });

  it('replies in Spanish when the lead wrote in Spanish', async () => {
    settingsRow = { lead_auto_reply_enabled: true, language: 'both' };
    await notifyNewLead(supabase, {
      companyId: 'comp-1',
      lead: { ...LEAD, name: 'José Ruiz', message: 'Necesito arreglar la cerca, gracias' },
    });
    expect(mockSendSMS.mock.calls[0][0].body).toContain('¡Hola José!');
  });

  it('never auto-replies without a phone number', async () => {
    settingsRow = { lead_auto_reply_enabled: true };
    const r = await notifyNewLead(supabase, { companyId: 'comp-1', lead: { ...LEAD, phone: null } });
    expect(r.autoReplied).toBe(false);
    expect(mockSendSMS).not.toHaveBeenCalled();
  });

  it('does not open a thread when Twilio rejects the auto-reply', async () => {
    settingsRow = { lead_auto_reply_enabled: true };
    mockSendSMS.mockResolvedValue({ success: false, error: 'Invalid number' });
    const r = await notifyNewLead(supabase, { companyId: 'comp-1', lead: LEAD });
    expect(r.autoReplied).toBe(false);
    expect(inserts.find((i) => i.table === 'jenny_sms_conversations')).toBeUndefined();
  });

  it('builds compact bilingual copy', () => {
    expect(buildLeadAlertText({ lead: LEAD, lang: 'es' })).toContain('Nuevo lead');
    expect(buildLeadAutoReply({ companyName: 'Green Co', lead: LEAD, lang: 'en' })).toMatch(/^Hi Sarah! This is Green Co/);
  });
});
