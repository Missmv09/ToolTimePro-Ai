/**
 * @jest-environment node
 */

const mockSendSMS = jest.fn();
jest.mock('@/lib/twilio', () => ({
  sendSMS: (...args) => mockSendSMS(...args),
}));

const {
  sendOwnerReply,
  resolveConversation,
  handBackToJenny,
  takeOverConversation,
  isHumanTakeoverActive,
  HUMAN_TAKEOVER_HOURS,
} = require('@/lib/jenny-inbox');

// ── Fake Supabase ────────────────────────────────────────────────────────────
let conversationRow;
let inserts;
let updates;

function builder(table) {
  const obj = {};
  ['select', 'eq', 'order', 'limit'].forEach((m) => {
    obj[m] = jest.fn(() => obj);
  });
  obj.insert = jest.fn((payload) => {
    inserts.push({ table, payload });
    return obj;
  });
  obj.update = jest.fn((payload) => {
    updates.push({ table, payload });
    return obj;
  });
  obj.maybeSingle = jest.fn(() =>
    Promise.resolve(table === 'jenny_sms_conversations' ? { data: conversationRow, error: null } : { data: null, error: null })
  );
  obj.then = (resolve) => resolve({ data: null, error: null });
  return obj;
}

const supabase = { from: jest.fn((table) => builder(table)) };

const BASE = { supabase, companyId: 'comp-1', conversationId: 'conv-1' };

describe('jenny-inbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inserts = [];
    updates = [];
    conversationRow = {
      id: 'conv-1',
      company_id: 'comp-1',
      customer_phone: '+15559998888',
      customer_name: 'Maria',
      message_count: 3,
      status: 'needs_response',
      human_takeover_until: null,
    };
    mockSendSMS.mockResolvedValue({ success: true, messageId: 'SM123' });
  });

  describe('isHumanTakeoverActive', () => {
    it('is false with no deadline', () => {
      expect(isHumanTakeoverActive(null)).toBe(false);
      expect(isHumanTakeoverActive({})).toBe(false);
      expect(isHumanTakeoverActive({ human_takeover_until: null })).toBe(false);
    });
    it('is true only while the deadline is in the future', () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      const past = new Date(Date.now() - 60_000).toISOString();
      expect(isHumanTakeoverActive({ human_takeover_until: future })).toBe(true);
      expect(isHumanTakeoverActive({ human_takeover_until: past })).toBe(false);
    });
  });

  describe('sendOwnerReply', () => {
    it('rejects an empty message without touching Twilio', async () => {
      const r = await sendOwnerReply({ ...BASE, userId: 'user-1', body: '   ' });
      expect(r.ok).toBe(false);
      expect(mockSendSMS).not.toHaveBeenCalled();
    });

    it('refuses a conversation that is not in the caller company', async () => {
      conversationRow = null; // the company-scoped lookup found nothing
      const r = await sendOwnerReply({ ...BASE, userId: 'user-1', body: 'hi' });
      expect(r.ok).toBe(false);
      expect(r.error).toBe('Conversation not found');
      expect(mockSendSMS).not.toHaveBeenCalled();
    });

    it('texts the customer, logs the message as the owner, and pauses Jenny', async () => {
      const before = Date.now();
      const r = await sendOwnerReply({ ...BASE, userId: 'user-1', body: 'On my way, 20 minutes!' });

      expect(r.ok).toBe(true);
      expect(mockSendSMS).toHaveBeenCalledWith({ to: '+15559998888', body: 'On my way, 20 minutes!' });

      const msg = inserts.find((i) => i.table === 'jenny_sms_messages');
      expect(msg).toBeDefined();
      expect(msg.payload).toMatchObject({
        conversation_id: 'conv-1',
        direction: 'outbound',
        sender: 'owner',
        sent_by: 'user-1',
        twilio_sid: 'SM123',
      });

      const conv = updates.find((u) => u.table === 'jenny_sms_conversations');
      expect(conv.payload.status).toBe('active');
      expect(conv.payload.message_count).toBe(4);
      const until = new Date(conv.payload.human_takeover_until).getTime();
      expect(until).toBeGreaterThan(before + (HUMAN_TAKEOVER_HOURS - 0.1) * 3600 * 1000);
    });

    it('does not log a message when Twilio rejects the send', async () => {
      mockSendSMS.mockResolvedValue({ success: false, error: 'Unsubscribed recipient' });
      const r = await sendOwnerReply({ ...BASE, userId: 'user-1', body: 'hello' });
      expect(r.ok).toBe(false);
      expect(r.error).toBe('Unsubscribed recipient');
      expect(inserts).toHaveLength(0);
      expect(updates).toHaveLength(0);
    });
  });

  describe('thread controls', () => {
    it('resolve closes the thread and clears the takeover', async () => {
      const r = await resolveConversation(BASE);
      expect(r.ok).toBe(true);
      expect(updates[0].payload).toMatchObject({ status: 'resolved', human_takeover_until: null });
    });

    it('handback clears the takeover and reopens a resolved thread', async () => {
      conversationRow.status = 'resolved';
      conversationRow.human_takeover_until = new Date(Date.now() + 3600_000).toISOString();
      const r = await handBackToJenny(BASE);
      expect(r.ok).toBe(true);
      expect(updates[0].payload).toMatchObject({ status: 'active', human_takeover_until: null });
    });

    it('takeover sets a future deadline without sending anything', async () => {
      const r = await takeOverConversation(BASE);
      expect(r.ok).toBe(true);
      expect(mockSendSMS).not.toHaveBeenCalled();
      expect(new Date(updates[0].payload.human_takeover_until).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
