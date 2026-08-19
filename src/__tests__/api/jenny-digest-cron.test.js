/**
 * @jest-environment node
 */

/**
 * Tests for /api/jenny-digest (weekly digest cron).
 *
 * The aggregation itself is covered by jenny-digest.test.ts against pure
 * functions. What lives only here is the orchestration: who gets a digest,
 * who is skipped, and — the one that matters — that a company is recorded as
 * sent only after the email actually goes out. Getting that order wrong marks
 * a failed send as delivered and the week is lost silently, which is the same
 * class of bug as the constraint that made this work necessary.
 */

// ============================================================
// MOCK SETUP
// ============================================================

/** Per-table fixtures: { rows, error, insertError }. */
const tables = {};
/** Every insert the route performs, in order. */
const inserts = [];

function setTable(name, config) {
  tables[name] = config;
}

function chainFor(name) {
  const config = tables[name] || {};
  const result = { data: config.rows ?? [], error: config.error ?? null };

  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lt: () => chain,
    order: () => chain,
    single: () =>
      Promise.resolve({
        data: (config.rows || [])[0] ?? null,
        error: config.error ?? null,
      }),
    insert: (row) => {
      inserts.push({ table: name, row });
      return Promise.resolve({ error: config.insertError ?? null });
    },
    // Thenable, so `await supabase.from(x).select().eq(...)` resolves.
    then: (resolve) => resolve(result),
  };

  return chain;
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => chainFor(table)),
  })),
}));

const mockSendDigest = jest.fn().mockResolvedValue({ id: 'email-1' });
jest.mock('@/lib/email', () => ({
  sendJennyWeeklyDigestEmail: (...args) => mockSendDigest(...args),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.CRON_SECRET = 'test-cron-secret';

const { GET } = require('@/app/api/jenny-digest/route');

function cronRequest(secret = 'test-cron-secret') {
  return new Request('http://localhost/api/jenny-digest', {
    method: 'GET',
    headers: { Authorization: `Bearer ${secret}` },
  });
}

/** An executed log row that lands in the "Jobs & Crew" category. */
function executedRow(overrides = {}) {
  return {
    action_type: 'auto_dispatch',
    title: 'Assigned job to Maria',
    status: 'executed',
    created_at: '2026-08-12T10:00:00Z',
    ...overrides,
  };
}

const OWNER = { full_name: 'Dana Reyes', email: 'dana@example.com' };

/** The common case: one company, Jenny enabled, one executed action, an owner. */
function arrangeOneCompanyWithWork() {
  setTable('jenny_action_configs', { rows: [{ company_id: 'co-1' }] });
  setTable('jenny_digest_sends', { rows: [] });
  setTable('jenny_action_log', { rows: [executedRow()] });
  setTable('users', { rows: [OWNER] });
}

const digestSendRecords = () => inserts.filter((i) => i.table === 'jenny_digest_sends');

// ============================================================
// TESTS
// ============================================================

describe('/api/jenny-digest (GET - cron)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendDigest.mockResolvedValue({ id: 'email-1' });
    Object.keys(tables).forEach((k) => delete tables[k]);
    inserts.length = 0;
  });

  describe('authentication', () => {
    it('rejects a wrong cron secret', async () => {
      const response = await GET(cronRequest('nope'));
      expect(response.status).toBe(401);
      expect(mockSendDigest).not.toHaveBeenCalled();
    });

    it('accepts the configured cron secret', async () => {
      setTable('jenny_action_configs', { rows: [] });
      const response = await GET(cronRequest());
      expect(response.status).toBe(200);
    });
  });

  describe('who gets a digest', () => {
    it('sends nothing when no company has Jenny enabled', async () => {
      setTable('jenny_action_configs', { rows: [] });

      const body = await (await GET(cronRequest())).json();

      expect(body.message).toMatch(/no companies/i);
      expect(mockSendDigest).not.toHaveBeenCalled();
    });

    it('emails the owner when there is work to report', async () => {
      arrangeOneCompanyWithWork();

      const body = await (await GET(cronRequest())).json();

      expect(body.results.sent).toBe(1);
      expect(mockSendDigest).toHaveBeenCalledTimes(1);

      const [arg] = mockSendDigest.mock.calls[0];
      expect(arg.to).toBe('dana@example.com');
      expect(arg.name).toBe('Dana');
      expect(arg.digest.totalCompleted).toBe(1);
    });

    it('counts a company once even with several enabled actions', async () => {
      setTable('jenny_action_configs', {
        rows: [{ company_id: 'co-1' }, { company_id: 'co-1' }, { company_id: 'co-1' }],
      });
      setTable('jenny_digest_sends', { rows: [] });
      setTable('jenny_action_log', { rows: [executedRow()] });
      setTable('users', { rows: [OWNER] });

      const body = await (await GET(cronRequest())).json();

      expect(body.results.considered).toBe(1);
      expect(mockSendDigest).toHaveBeenCalledTimes(1);
    });

    it('skips a week with nothing to report rather than sending an empty digest', async () => {
      arrangeOneCompanyWithWork();
      setTable('jenny_action_log', { rows: [] });

      const body = await (await GET(cronRequest())).json();

      expect(body.results.skipped_empty).toBe(1);
      expect(body.results.sent).toBe(0);
      expect(mockSendDigest).not.toHaveBeenCalled();
    });

    it('skips a company with no owner on file', async () => {
      arrangeOneCompanyWithWork();
      setTable('users', { rows: [] });

      const body = await (await GET(cronRequest())).json();

      expect(body.results.sent).toBe(0);
      expect(mockSendDigest).not.toHaveBeenCalled();
    });

    it('does not send the same period twice', async () => {
      arrangeOneCompanyWithWork();
      setTable('jenny_digest_sends', { rows: [{ company_id: 'co-1' }] });

      const body = await (await GET(cronRequest())).json();

      expect(body.results.skipped_duplicate).toBe(1);
      expect(mockSendDigest).not.toHaveBeenCalled();
    });
  });

  describe('recording the send', () => {
    it('records the company and period after a successful send', async () => {
      arrangeOneCompanyWithWork();

      await GET(cronRequest());

      const records = digestSendRecords();
      expect(records).toHaveLength(1);
      expect(records[0].row.company_id).toBe('co-1');
      expect(records[0].row.sent_to).toBe('dana@example.com');
      expect(records[0].row.total_completed).toBe(1);
    });

    it('does NOT record the send when the email fails, so it retries next run', async () => {
      arrangeOneCompanyWithWork();
      mockSendDigest.mockRejectedValue(new Error('Resend is down'));

      const body = await (await GET(cronRequest())).json();

      expect(body.results.failed).toBe(1);
      expect(body.results.sent).toBe(0);
      expect(digestSendRecords()).toHaveLength(0);
    });

    it('still counts the send when only the bookkeeping insert fails', async () => {
      arrangeOneCompanyWithWork();
      setTable('jenny_digest_sends', { rows: [], insertError: { message: 'unique violation' } });

      const body = await (await GET(cronRequest())).json();

      // The email went out. Reporting it as failed would be a lie, and would
      // re-send next run on top of the unique constraint.
      expect(body.results.sent).toBe(1);
    });
  });

  describe('failure isolation', () => {
    it('reports a 500 when the config query itself fails', async () => {
      setTable('jenny_action_configs', { rows: null, error: { message: 'connection reset' } });

      const response = await GET(cronRequest());

      expect(response.status).toBe(500);
      expect(mockSendDigest).not.toHaveBeenCalled();
    });

    it('counts a company whose log read fails without aborting the run', async () => {
      setTable('jenny_action_configs', { rows: [{ company_id: 'co-1' }, { company_id: 'co-2' }] });
      setTable('jenny_digest_sends', { rows: [] });
      setTable('jenny_action_log', { rows: null, error: { message: 'timeout' } });
      setTable('users', { rows: [OWNER] });

      const body = await (await GET(cronRequest())).json();

      expect(body.results.considered).toBe(2);
      expect(body.results.failed).toBe(2);
      expect(mockSendDigest).not.toHaveBeenCalled();
    });

    it('keeps going for other companies when one send throws', async () => {
      setTable('jenny_action_configs', { rows: [{ company_id: 'co-1' }, { company_id: 'co-2' }] });
      setTable('jenny_digest_sends', { rows: [] });
      setTable('jenny_action_log', { rows: [executedRow()] });
      setTable('users', { rows: [OWNER] });

      mockSendDigest
        .mockRejectedValueOnce(new Error('first one blew up'))
        .mockResolvedValueOnce({ id: 'email-2' });

      const body = await (await GET(cronRequest())).json();

      expect(body.results.failed).toBe(1);
      expect(body.results.sent).toBe(1);
    });
  });

  describe('reporting', () => {
    it('returns the period it covered', async () => {
      arrangeOneCompanyWithWork();

      const body = await (await GET(cronRequest())).json();

      expect(body.period.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.period.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.period.start < body.period.end).toBe(true);
    });
  });
});
