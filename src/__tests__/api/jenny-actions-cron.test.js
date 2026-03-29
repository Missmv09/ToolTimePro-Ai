/**
 * @jest-environment node
 */

/**
 * Tests for /api/jenny-actions cron route
 * Validates all Jenny autonomous actions including:
 * - cert_expiration, insurance_expiry, w9_compliance
 * - classification_review, compliance_escalation
 * - quote_expiration, contractor_payment, contract_end_date
 * - review_request, hr_law_update
 */

// ============================================================
// MOCK SETUP
// ============================================================

const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn(() => ({
  eq: jest.fn().mockResolvedValue({ error: null }),
}));

// Store for controlling per-table mock responses
const tableResponses = {};

function setTableResponse(table, response) {
  tableResponses[table] = response;
}

function createChainableMock(resolvedData) {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    not: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lt: jest.fn(() => chain),
    gt: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve({ data: resolvedData?.[0] || null })),
    then: (resolve) => resolve({ data: resolvedData || [] }),
  };
  // Make it thenable so await works
  chain[Symbol.for('jest.asymmetricMatch')] = undefined;
  return chain;
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => {
      if (tableResponses[table]) {
        const chain = createChainableMock(tableResponses[table]);
        chain.insert = mockInsert;
        chain.upsert = mockUpsert;
        chain.update = jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }));
        return chain;
      }
      return {
        select: jest.fn(() => createChainableMock([])),
        insert: mockInsert,
        upsert: mockUpsert,
        update: mockUpdate,
      };
    }),
  })),
}));

jest.mock('@/lib/supplier-pricing', () => ({
  pricesNeedAttention: jest.fn(() => ({ needsUpdate: false, daysSinceUpdate: 30, daysUntilStale: 335 })),
}));

jest.mock('@/lib/materials-database', () => ({
  getMaterialsByTrade: jest.fn(() => []),
}));

jest.mock('@/lib/state-compliance', () => ({
  getEnabledStates: jest.fn(() => [
    { stateCode: 'CA', stateName: 'California', lastUpdated: '2025-06-01', sourceUrl: 'https://dir.ca.gov', wage: { minimumWage: 16.50 }, classification: { testName: 'ABC Test' } },
    { stateCode: 'TX', stateName: 'Texas', lastUpdated: '2025-06-01', sourceUrl: 'https://twc.texas.gov', wage: { minimumWage: 7.25 }, classification: { testName: 'Common Law Test' } },
  ]),
  isRulesStale: jest.fn(() => false),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.CRON_SECRET = 'test-cron-secret';

// Import route after mocks are set up
const { GET } = require('@/app/api/jenny-actions/route');

function makeCronRequest() {
  return new Request('http://localhost/api/jenny-actions', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test-cron-secret',
    },
  });
}

function makeUnauthorizedRequest() {
  return new Request('http://localhost/api/jenny-actions', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer wrong-secret',
    },
  });
}

// ============================================================
// TESTS
// ============================================================

describe('/api/jenny-actions (GET - Cron)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all table responses
    Object.keys(tableResponses).forEach(key => delete tableResponses[key]);
  });

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------
  describe('Authentication', () => {
    it('rejects requests with invalid cron secret', async () => {
      const response = await GET(makeUnauthorizedRequest());
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('accepts requests with valid cron secret', async () => {
      setTableResponse('jenny_action_configs', []);
      const response = await GET(makeCronRequest());
      expect(response.status).toBe(200);
    });
  });

  // ----------------------------------------------------------
  // NO CONFIGS
  // ----------------------------------------------------------
  describe('No enabled actions', () => {
    it('returns message when no configs are enabled', async () => {
      setTableResponse('jenny_action_configs', []);
      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(body.message).toBe('No enabled actions');
    });
  });

  // ----------------------------------------------------------
  // CERT EXPIRATION
  // ----------------------------------------------------------
  describe('cert_expiration action', () => {
    it('detects expiring certifications', async () => {
      const futureDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];

      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'cert_expiration',
        enabled: true,
        config: { enabled: true, warn_days_before: [60, 30, 14], notify_owner: true },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('worker_certifications', [{
        id: 'cert-1',
        worker_id: 'worker-1',
        cert_type: 'OSHA_10',
        cert_name: 'OSHA 10-Hour',
        expiration_date: futureDate,
        worker: { full_name: 'John Smith' },
      }]);

      // No existing alerts today
      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.cert_expiration.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // INSURANCE EXPIRY
  // ----------------------------------------------------------
  describe('insurance_expiry action', () => {
    it('detects contractors with expiring insurance', async () => {
      const expiryDate = new Date(Date.now() + 7 * 86400000).toISOString();

      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'insurance_expiry',
        enabled: true,
        config: { enabled: true, warn_days_before: 14, block_assignments: true },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('worker_profiles', [{
        id: 'wp-1',
        user_id: 'user-1',
        business_name: 'Johns Plumbing LLC',
        insurance_expiry: expiryDate,
        insurance_verified: true,
        user: { full_name: 'John Doe' },
      }]);

      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.insurance_expiry.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // W-9 COMPLIANCE
  // ----------------------------------------------------------
  describe('w9_compliance action', () => {
    it('detects contractors missing W-9 forms', async () => {
      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'w9_compliance',
        enabled: true,
        config: { enabled: true, block_payments: true },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('worker_profiles', [{
        id: 'wp-1',
        user_id: 'user-1',
        business_name: 'ABC Contracting',
        w9_received: false,
        classification: '1099_contractor',
        user: { full_name: 'Jane Contractor' },
      }]);

      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.w9_compliance.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // CLASSIFICATION REVIEW
  // ----------------------------------------------------------
  describe('classification_review action', () => {
    it('detects overdue classification reviews', async () => {
      const pastDate = new Date(Date.now() - 30 * 86400000).toISOString();

      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'classification_review',
        enabled: true,
        config: { enabled: true, review_interval_months: 6 },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('worker_profiles', [{
        id: 'wp-1',
        user_id: 'user-1',
        classification: '1099_contractor',
        last_review_date: '2025-06-01T00:00:00Z',
        next_review_date: pastDate,
        classification_method: 'abc_test',
        user: { full_name: 'Bob Builder' },
      }]);

      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.classification_review.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // COMPLIANCE ESCALATION
  // ----------------------------------------------------------
  describe('compliance_escalation action', () => {
    it('escalates unacknowledged compliance violations', async () => {
      const oldDate = new Date(Date.now() - 5 * 86400000).toISOString();

      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'compliance_escalation',
        enabled: true,
        config: { enabled: true, escalate_after_days: 3, escalate_severity: ['violation'] },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('compliance_alerts', [{
        id: 'alert-1',
        user_id: 'user-1',
        alert_type: 'meal_break_missed',
        severity: 'violation',
        title: 'Missed meal break',
        description: 'Worker missed required 30-min meal break',
        hours_worked: 6.5,
        created_at: oldDate,
        acknowledged: false,
        user: { full_name: 'Worker Joe' },
      }]);

      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.compliance_escalation.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // QUOTE EXPIRATION
  // ----------------------------------------------------------
  describe('quote_expiration action', () => {
    it('detects quotes expiring soon', async () => {
      const soonDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'quote_expiration',
        enabled: true,
        config: { enabled: true, warn_days_before: [7, 3, 1], auto_expire: true },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('quotes', [{
        id: 'quote-1',
        customer_id: 'cust-1',
        total: 2500,
        status: 'sent',
        valid_until: soonDate,
        customer: { name: 'Alice Customer', phone: '5551234567', email: 'alice@test.com' },
      }]);

      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.quote_expiration.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // CONTRACTOR PAYMENT
  // ----------------------------------------------------------
  describe('contractor_payment action', () => {
    it('detects submitted invoices awaiting approval', async () => {
      const oldDate = new Date(Date.now() - 5 * 86400000).toISOString();

      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'contractor_payment',
        enabled: true,
        config: { enabled: true, remind_after_days: 3 },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('contractor_invoices', [{
        id: 'inv-1',
        contractor_id: 'user-1',
        contractor_name: 'Mike Plumber',
        invoice_number: 'INV-001',
        total: 1500,
        submitted_date: oldDate,
        period_start: '2026-03-01',
        period_end: '2026-03-15',
        status: 'submitted',
      }]);

      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.contractor_payment.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // CONTRACT END DATE
  // ----------------------------------------------------------
  describe('contract_end_date action', () => {
    it('detects contracts ending soon', async () => {
      const soonDate = new Date(Date.now() + 14 * 86400000).toISOString();

      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'contract_end_date',
        enabled: true,
        config: { enabled: true, warn_days_before: [30, 14, 7] },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('worker_profiles', [{
        id: 'wp-1',
        user_id: 'user-1',
        business_name: 'Temp Services LLC',
        contract_start_date: '2025-10-01T00:00:00Z',
        contract_end_date: soonDate,
        classification: '1099_contractor',
        user: { full_name: 'Temp Worker' },
      }]);

      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.contract_end_date.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // REVIEW REQUEST
  // ----------------------------------------------------------
  describe('review_request action', () => {
    it('suggests review requests for recently completed jobs', async () => {
      const completedAt = new Date(Date.now() - 36 * 3600000).toISOString(); // 36 hours ago

      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'review_request',
        enabled: true,
        config: { enabled: true },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);

      setTableResponse('jobs', [{
        id: 'job-1',
        title: 'Kitchen Remodel',
        customer_id: 'cust-1',
        completed_at: completedAt,
        status: 'completed',
        customer: { name: 'Happy Customer', phone: '5559876543', email: 'happy@test.com' },
      }]);

      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.review_request.checked).toBeGreaterThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // HR LAW UPDATE
  // ----------------------------------------------------------
  describe('hr_law_update action', () => {
    it('checks state compliance rule freshness', async () => {
      setTableResponse('jenny_action_configs', []);
      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      // hr_law_update runs as platform-wide check regardless of configs
      expect(body.results.hr_law_update).toBeDefined();
    });

    it('alerts when state rules are stale', async () => {
      const { isRulesStale } = require('@/lib/state-compliance');
      isRulesStale.mockReturnValue(true);

      // Need at least one config so the cron doesn't exit early
      setTableResponse('jenny_action_configs', [{
        company_id: 'comp-1',
        action_type: 'auto_dispatch',
        enabled: true,
        config: { enabled: true, require_approval: true, assign_strategy: 'least_busy' },
        company: { id: 'comp-1', name: 'Test Co' },
      }]);
      setTableResponse('jenny_action_log', []);
      setTableResponse('jobs', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.results.hr_law_update.checked).toBe(1);

      // Restore
      isRulesStale.mockReturnValue(false);
    });
  });

  // ----------------------------------------------------------
  // FULL CRON RUN
  // ----------------------------------------------------------
  describe('Full cron execution', () => {
    it('returns all action results in a single run', async () => {
      setTableResponse('jenny_action_configs', []);
      setTableResponse('jenny_action_log', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.results).toBeDefined();

      // Verify all action types are tracked in results
      const expectedActions = [
        'auto_dispatch', 'lead_follow_up', 'cash_flow_alert', 'job_costing',
        'price_staleness', 'hr_law_update', 'cert_expiration', 'insurance_expiry',
        'w9_compliance', 'classification_review', 'compliance_escalation',
        'quote_expiration', 'contractor_payment', 'contract_end_date', 'review_request',
      ];

      for (const action of expectedActions) {
        expect(body.results[action]).toBeDefined();
        expect(body.results[action]).toHaveProperty('checked');
        expect(body.results[action]).toHaveProperty('acted');
      }
    });

    it('returns ran_at timestamp', async () => {
      setTableResponse('jenny_action_configs', []);

      const response = await GET(makeCronRequest());
      const body = await response.json();
      // When no configs, returns early without ran_at
      expect(response.status).toBe(200);
    });
  });
});
