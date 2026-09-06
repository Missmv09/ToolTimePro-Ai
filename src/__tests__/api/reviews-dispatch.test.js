/**
 * @jest-environment node
 */

// /api/reviews/dispatch — the 15-minute review-request dispatcher.

const mockSendSMS = jest.fn().mockResolvedValue({ success: true, messageId: 'SM1' });
jest.mock('@/lib/twilio', () => ({
  sendSMS: (...a) => mockSendSMS(...a),
  SMS_TEMPLATES: { reviewRequest: (d) => `REVIEW ${d.customerName} ${d.reviewLink || 'nolink'}` },
}));

const mockSendReviewEmail = jest.fn().mockResolvedValue({ id: 'em_1' });
jest.mock('@/lib/email', () => ({ sendReviewRequestEmail: (...a) => mockSendReviewEmail(...a) }));

const mockSchedule = jest.fn().mockResolvedValue({ scheduled: true, id: 'rr-new' });
jest.mock('@/lib/after-payment', () => ({
  scheduleReviewRequest: (...a) => mockSchedule(...a),
  BASE_URL: 'https://app.test',
}));

const { createQueryMock, filterValue } = require('@/__mocks__/supabase-query-mock');
let sb;
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => sb) }));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
delete process.env.CRON_SECRET;

const { GET } = require('@/app/api/reviews/dispatch/route');

const req = (headers = {}) => new Request('http://localhost/api/reviews/dispatch', { method: 'GET', headers });

const COMPANY = { id: 'co-1', name: 'Acme', google_review_link: 'https://g.page/acme', yelp_review_link: null };
const PENDING = { id: 'rr-1', company_id: 'co-1', job_id: 'job-1', customer_id: 'cust-1', customer_name: 'Jane', tracking_token: 'rv-abc' };

function handler({ jobs = [], existing = [], due = [], customer, company = COMPANY, settings = null } = {}) {
  return (state) => {
    const key = `${state.table}.${state.op}`;
    switch (key) {
      case 'jobs.select': return { data: jobs, error: null };
      case 'jobs.update': return { data: null, error: null };
      case 'review_requests.select':
        if (state.filters.some((f) => f.name === 'in')) return { data: existing, error: null };
        if (filterValue(state, 'eq', 'status') === 'pending') return { data: due, error: null };
        return { data: [], error: null }; // last-sent platform lookup
      case 'review_requests.insert': return { data: { id: 'rr-skip' }, error: null };
      case 'review_requests.update': return { data: null, error: null };
      case 'companies.select': return { data: company, error: null };
      case 'jenny_pro_settings.select': return { data: settings, error: null };
      case 'jenny_action_configs.select': return { data: null, error: null };
      case 'customers.select': return { data: customer === undefined ? { name: 'Jane Doe', phone: '5551112222', email: 'jane@example.com', sms_consent: true } : customer, error: null };
      default: return { data: null, error: null };
    }
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe('/api/reviews/dispatch', () => {
  it('requires the cron secret when one is configured', async () => {
    process.env.CRON_SECRET = 'top-secret';
    sb = createQueryMock(handler());
    const denied = await GET(req());
    expect(denied.status).toBe(401);
    const ok = await GET(req({ 'X-Cron-Secret': 'top-secret' }));
    expect(ok.status).toBe(200);
  });

  it('queues a request for each newly completed job that has none', async () => {
    sb = createQueryMock(handler({
      jobs: [
        { id: 'job-1', company_id: 'co-1', customer_id: 'cust-1', updated_at: '2026-09-05T10:00:00Z' },
        { id: 'job-2', company_id: 'co-1', customer_id: 'cust-2', updated_at: '2026-09-05T11:00:00Z' },
      ],
      existing: [{ job_id: 'job-2' }],
    }));
    const res = await GET(req());
    const body = await res.json();
    expect(body.queued).toBe(1);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith(sb, { companyId: 'co-1', customerId: 'cust-1', jobId: 'job-1', trigger: 'job_completed', baseTime: '2026-09-05T10:00:00Z' });
  });

  it('writes a skip marker so a job with automation off is not re-evaluated every run', async () => {
    mockSchedule.mockResolvedValueOnce({ scheduled: false, reason: 'disabled' });
    sb = createQueryMock(handler({ jobs: [{ id: 'job-1', company_id: 'co-1', customer_id: 'cust-1', updated_at: '2026-09-05T10:00:00Z' }] }));
    await GET(req());
    const marker = sb.calls.find((c) => c.table === 'review_requests' && c.op === 'insert');
    expect(marker.payload).toMatchObject({ job_id: 'job-1', status: 'skipped', error: 'disabled', trigger: 'job_completed' });
  });

  it('texts a consented customer a tracked review link and stamps the job', async () => {
    sb = createQueryMock(handler({ due: [PENDING] }));
    const res = await GET(req());
    const body = await res.json();
    expect(body).toMatchObject({ sent: 1, skipped: 0, failed: 0 });
    expect(mockSendSMS).toHaveBeenCalledWith({ to: '5551112222', body: 'REVIEW Jane Doe https://app.test/r/rv-abc' });
    expect(mockSendReviewEmail).not.toHaveBeenCalled();

    const upd = sb.calls.find((c) => c.table === 'review_requests' && c.op === 'update');
    expect(upd.payload).toMatchObject({ status: 'sent', channel: 'sms', review_link: 'https://g.page/acme', review_platform: 'google', customer_phone: '5551112222' });
    expect(filterValue(upd, 'eq', 'id')).toBe('rr-1');

    const job = sb.calls.find((c) => c.table === 'jobs' && c.op === 'update');
    expect(job.payload.followup_sent_at).toBeTruthy();
    expect(filterValue(job, 'eq', 'id')).toBe('job-1');
  });

  it('falls back to email when the customer has not consented to SMS', async () => {
    sb = createQueryMock(handler({ due: [PENDING], customer: { name: 'Jane Doe', phone: '5551112222', email: 'jane@example.com', sms_consent: false } }));
    const body = await (await GET(req())).json();
    expect(body.sent).toBe(1);
    expect(mockSendSMS).not.toHaveBeenCalled();
    expect(mockSendReviewEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'jane@example.com', companyName: 'Acme', reviewLink: 'https://app.test/r/rv-abc', platformLabel: 'Google' }));
    expect(sb.calls.find((c) => c.table === 'review_requests' && c.op === 'update').payload.channel).toBe('email');
  });

  it('skips a customer with no usable channel', async () => {
    sb = createQueryMock(handler({ due: [PENDING], customer: { name: 'X', phone: null, email: null, sms_consent: false } }));
    const body = await (await GET(req())).json();
    expect(body).toMatchObject({ sent: 0, skipped: 1 });
    expect(sb.calls.find((c) => c.table === 'review_requests' && c.op === 'update').payload).toMatchObject({ status: 'skipped', error: 'no_channel' });
  });

  it('honours the company toggle at send time', async () => {
    sb = createQueryMock(handler({ due: [PENDING], settings: { review_followup_enabled: false } }));
    const body = await (await GET(req())).json();
    expect(body.skipped).toBe(1);
    expect(mockSendSMS).not.toHaveBeenCalled();
  });

  it('sends a link-free thank-you when the company has no review link yet', async () => {
    sb = createQueryMock(handler({ due: [PENDING], company: { ...COMPANY, google_review_link: null } }));
    const body = await (await GET(req())).json();
    expect(body.sent).toBe(1);
    expect(mockSendSMS).toHaveBeenCalledWith({ to: '5551112222', body: 'REVIEW Jane Doe nolink' });
  });

  it('marks a request failed when every channel errors', async () => {
    mockSendSMS.mockResolvedValueOnce({ success: false, error: 'twilio down' });
    mockSendReviewEmail.mockRejectedValueOnce(new Error('resend down'));
    sb = createQueryMock(handler({ due: [PENDING] }));
    const body = await (await GET(req())).json();
    expect(body.failed).toBe(1);
    expect(sb.calls.find((c) => c.table === 'review_requests' && c.op === 'update').payload).toMatchObject({ status: 'failed', error: 'resend down' });
  });
});
