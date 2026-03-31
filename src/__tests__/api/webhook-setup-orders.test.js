/**
 * @jest-environment node
 */

/**
 * Tests for Stripe webhook: setup service order creation
 * Validates that purchasing assisted_onboarding or white_glove creates a setup_service_orders row
 */

const mockConstructEvent = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockSendWelcomeEmail = jest.fn().mockResolvedValue(undefined);

jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

jest.mock('@/lib/email', () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { POST } = require('@/app/api/webhook/stripe/route');

function makeWebhookRequest(body = '{}', signature = 'sig_test') {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (name) => (name === 'stripe-signature' ? signature : null),
    },
  };
}

describe('Stripe webhook: setup service orders', () => {
  let mockSingle, mockEq, mockSelect, mockUpdate, mockInsert;

  function setupMocks() {
    mockSingle = jest.fn();
    mockEq = jest.fn().mockReturnThis();
    mockEq.mockReturnValue({ single: mockSingle, eq: mockEq });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

    mockSupabaseFrom.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-001', company_id: 'company-001' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'companies') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'company-001', addons: [] },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      if (table === 'setup_service_orders') {
        return { insert: mockInsert };
      }
      return {
        select: mockSelect,
        update: mockUpdate,
        insert: mockInsert,
      };
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('creates a setup order for assisted_onboarding purchase', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'test@test.com',
          customer: 'cus_test',
          payment_intent: 'pi_test',
          metadata: {
            plan: 'pro',
            tier: 'pro',
            standalone: '',
            addons: '',
            billing: 'monthly',
            onboarding: 'assisted_onboarding',
          },
        },
      },
    });

    await POST(makeWebhookRequest());

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-001',
        service_type: 'assisted_onboarding',
        status: 'pending',
        checklist: [],
      })
    );
  });

  it('creates a setup order for white_glove purchase', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'test@test.com',
          customer: 'cus_test',
          payment_intent: 'pi_wg',
          metadata: {
            plan: 'elite',
            tier: 'elite',
            standalone: '',
            addons: '',
            billing: 'monthly',
            onboarding: 'white_glove',
          },
        },
      },
    });

    await POST(makeWebhookRequest());

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-001',
        service_type: 'white_glove',
        status: 'pending',
      })
    );
  });

  it('does NOT create a setup order when no onboarding is purchased', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'test@test.com',
          customer: 'cus_test',
          metadata: {
            plan: 'pro',
            tier: 'pro',
            standalone: '',
            addons: '',
            billing: 'monthly',
            onboarding: '',
          },
        },
      },
    });

    await POST(makeWebhookRequest());

    // setup_service_orders insert should NOT be called
    const setupInsertCalls = mockInsert.mock.calls.filter(call =>
      call[0]?.service_type === 'assisted_onboarding' || call[0]?.service_type === 'white_glove'
    );
    expect(setupInsertCalls).toHaveLength(0);
  });

  it('does NOT create a setup order for invalid onboarding type', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'test@test.com',
          customer: 'cus_test',
          metadata: {
            plan: 'pro',
            tier: 'pro',
            standalone: '',
            addons: '',
            billing: 'monthly',
            onboarding: 'invalid_type',
          },
        },
      },
    });

    await POST(makeWebhookRequest());

    const setupInsertCalls = mockInsert.mock.calls.filter(call =>
      call[0]?.service_type
    );
    expect(setupInsertCalls).toHaveLength(0);
  });
});
