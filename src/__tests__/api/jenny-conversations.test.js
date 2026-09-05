/**
 * @jest-environment node
 */

const { NextResponse } = require('next/server');

let mockAuthResult;
jest.mock('@/lib/server-auth', () => ({
  authenticateRequest: jest.fn(() => Promise.resolve(mockAuthResult)),
}));

const mockSendOwnerReply = jest.fn();
const mockResolve = jest.fn();
const mockHandBack = jest.fn();
const mockTakeOver = jest.fn();
jest.mock('@/lib/jenny-inbox', () => ({
  sendOwnerReply: (...a) => mockSendOwnerReply(...a),
  resolveConversation: (...a) => mockResolve(...a),
  handBackToJenny: (...a) => mockHandBack(...a),
  takeOverConversation: (...a) => mockTakeOver(...a),
}));

let dbUserRow;
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: () => {
      const obj = {};
      obj.select = () => obj;
      obj.eq = () => obj;
      obj.single = () => Promise.resolve({ data: dbUserRow });
      return obj;
    },
  })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

const { POST } = require('@/app/api/jenny-pro/conversations/route');

function req(body) {
  return new Request('http://localhost/api/jenny-pro/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
    body: JSON.stringify(body),
  });
}

describe('/api/jenny-pro/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthResult = { user: { id: 'user-1' } };
    dbUserRow = { company_id: 'comp-1', role: 'owner' };
    mockSendOwnerReply.mockResolvedValue({ ok: true, messageId: 'SM1', takeoverUntil: '2030-01-01T00:00:00Z' });
    mockResolve.mockResolvedValue({ ok: true });
    mockHandBack.mockResolvedValue({ ok: true });
    mockTakeOver.mockResolvedValue({ ok: true, takeoverUntil: '2030-01-01T00:00:00Z' });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthResult = { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    const res = await POST(req({ action: 'reply', conversationId: 'c1', body: 'hi' }));
    expect(res.status).toBe(401);
    expect(mockSendOwnerReply).not.toHaveBeenCalled();
  });

  it('rejects unknown actions', async () => {
    const res = await POST(req({ action: 'delete_everything', conversationId: 'c1' }));
    expect(res.status).toBe(400);
  });

  it('rejects users with no company', async () => {
    dbUserRow = { company_id: null };
    const res = await POST(req({ action: 'reply', conversationId: 'c1', body: 'hi' }));
    expect(res.status).toBe(400);
    expect(mockSendOwnerReply).not.toHaveBeenCalled();
  });

  it('blocks field workers from the inbox', async () => {
    dbUserRow = { company_id: 'comp-1', role: 'worker' };
    const res = await POST(req({ action: 'reply', conversationId: 'c1', body: 'hi' }));
    expect(res.status).toBe(403);
  });

  it('sends a reply scoped to the caller company and user', async () => {
    const res = await POST(req({ action: 'reply', conversationId: 'c1', body: 'On my way!' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendOwnerReply).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'comp-1', userId: 'user-1', conversationId: 'c1', body: 'On my way!' })
    );
  });

  it('maps a missing conversation to 404', async () => {
    mockSendOwnerReply.mockResolvedValue({ ok: false, error: 'Conversation not found' });
    const res = await POST(req({ action: 'reply', conversationId: 'nope', body: 'hi' }));
    expect(res.status).toBe(404);
  });

  it('routes resolve / handback / takeover to the inbox helpers', async () => {
    await POST(req({ action: 'resolve', conversationId: 'c1' }));
    await POST(req({ action: 'handback', conversationId: 'c1' }));
    await POST(req({ action: 'takeover', conversationId: 'c1' }));
    expect(mockResolve).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'comp-1', conversationId: 'c1' }));
    expect(mockHandBack).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'comp-1', conversationId: 'c1' }));
    expect(mockTakeOver).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'comp-1', conversationId: 'c1' }));
  });
});
