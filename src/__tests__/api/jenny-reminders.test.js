/**
 * @jest-environment node
 */

let mockJobsResults = [[], []];
let mockActionConfigs = [];
let mockJobsIdx = 0;
const mockUpdateCalls = [];
const mockReviewInserts = [];

const mockSendSMS = jest.fn().mockResolvedValue({ success: true, messageId: 'SM1' });
jest.mock('@/lib/twilio', () => ({
  sendSMS: (...a) => mockSendSMS(...a),
  SMS_TEMPLATES: {
    bookingReminder: (d) => `Reminder: ${d.serviceName} with ${d.companyName} tomorrow ${d.date} ${d.time}`,
    jobComplete: (d) => (d.reviewLink ? `Thanks ${d.customerName}! Review: ${d.reviewLink}` : `Thanks ${d.customerName}!`),
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from(table) {
      if (table === 'jenny_pro_settings') {
        return { select: () => Promise.resolve({ data: [] }) };
      }
      if (table === 'jenny_action_configs') {
        return { select: () => ({ eq: () => Promise.resolve({ data: mockActionConfigs }) }) };
      }
      if (table === 'jobs') {
        const obj = {};
        obj.select = () => obj;
        obj.eq = () => obj;
        obj.is = () => obj;
        obj.gte = () => obj;
        obj.lte = () => obj;
        obj.limit = () => Promise.resolve({ data: mockJobsResults[mockJobsIdx++] || [] });
        obj.update = (payload) => { mockUpdateCalls.push(payload); return { eq: () => Promise.resolve({ error: null }) }; };
        return obj;
      }
      if (table === 'review_requests') {
        return { insert: (payload) => { mockReviewInserts.push(payload); return Promise.resolve({ error: null }); } };
      }
      return { select: () => Promise.resolve({ data: [] }) };
    },
  })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
delete process.env.CRON_SECRET;

const { GET } = require('@/app/api/jenny-pro/reminders/route');

function req() {
  return new Request('http://localhost/api/jenny-pro/reminders', { method: 'GET' });
}

describe('/api/jenny-pro/reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJobsResults = [[], []];
    mockActionConfigs = [];
    mockJobsIdx = 0;
    mockUpdateCalls.length = 0;
    mockReviewInserts.length = 0;
  });

  it('sends a reminder for a consented customer with a job tomorrow', async () => {
    mockJobsResults = [
      [{
        id: 'j1', title: 'Lawn Care', scheduled_date: '2026-07-02', scheduled_time_start: '09:00',
        company_id: 'c1', customer: { name: 'Maria', phone: '+15551112222', sms_consent: true }, company: { name: 'Green Co' },
      }],
      [],
    ];
    const res = await GET(req());
    const data = await res.json();
    expect(data.remindersSent).toBe(1);
    expect(mockSendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551112222' }));
    expect(mockUpdateCalls.some((u) => u.reminder_sent_at)).toBe(true);
  });

  it('skips customers without SMS consent', async () => {
    mockJobsResults = [
      [{
        id: 'j1', title: 'Lawn Care', scheduled_date: '2026-07-02', scheduled_time_start: '09:00',
        company_id: 'c1', customer: { name: 'Maria', phone: '+15551112222', sms_consent: false }, company: { name: 'Green Co' },
      }],
      [],
    ];
    const res = await GET(req());
    const data = await res.json();
    expect(data.remindersSent).toBe(0);
    expect(mockSendSMS).not.toHaveBeenCalled();
  });

  it('sends a post-job thank-you + review and logs it', async () => {
    mockJobsResults = [
      [],
      [{
        id: 'j2', title: 'Lawn Care', company_id: 'c1', customer_id: 'cu1', updated_at: new Date().toISOString(),
        customer: { name: 'Maria', phone: '+15551112222', sms_consent: true },
        company: { name: 'Green Co', google_review_link: 'https://g.page/review' },
      }],
    ];
    const res = await GET(req());
    const data = await res.json();
    expect(data.followupsSent).toBe(1);
    expect(mockSendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551112222' }));
    expect(mockUpdateCalls.some((u) => u.followup_sent_at)).toBe(true);
    expect(mockReviewInserts.length).toBe(1);
    expect(mockReviewInserts[0].review_platform).toBe('google');
  });

  it('uses the contractor\'s review link from the Jenny Actions config', async () => {
    mockActionConfigs = [{ company_id: 'c1', config: { google_review_link: 'https://g.page/contractor' } }];
    mockJobsResults = [
      [],
      [{
        id: 'j2', title: 'Lawn Care', company_id: 'c1', customer_id: 'cu1', updated_at: new Date().toISOString(),
        customer: { name: 'Maria', phone: '+15551112222', sms_consent: true },
        company: { name: 'Green Co' }, // no companies.* link — must come from config
      }],
    ];
    const res = await GET(req());
    const data = await res.json();
    expect(data.followupsSent).toBe(1);
    expect(mockSendSMS).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('https://g.page/contractor') })
    );
    expect(mockReviewInserts[0].review_link).toBe('https://g.page/contractor');
  });

  it('rejects unauthorized calls when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'secret';
    const res = await GET(req());
    expect(res.status).toBe(401);
    delete process.env.CRON_SECRET;
  });
});
