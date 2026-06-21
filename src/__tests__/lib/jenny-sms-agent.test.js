/**
 * @jest-environment node
 */

// Mock the AI client so we control Jenny's "thinking".
const mockAiComplete = jest.fn();
jest.mock('@/lib/ai-client', () => ({
  aiComplete: (...args) => mockAiComplete(...args),
  parseAIJson: jest.requireActual('@/lib/ai-client').parseAIJson,
}));

const { runJennyAgent } = require('@/lib/jenny-sms-agent');

// Supabase stub returning a company + services.
function makeSupabase() {
  return {
    from(table) {
      const obj = {};
      obj.select = jest.fn(() => obj);
      obj.eq = jest.fn(() => obj);
      obj.limit = jest.fn(() => {
        if (table === 'services') return { data: [{ name: 'Lawn Care', default_price: 60, duration_minutes: 60 }] };
        return obj;
      });
      obj.single = jest.fn(() => ({ data: { name: 'Green Co', business_type: 'landscaping' } }));
      return obj;
    },
  };
}

describe('runJennyAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('short-circuits to an emergency escalation without calling the AI', async () => {
    const res = await runJennyAgent({
      supabase: makeSupabase(),
      companyId: 'c1',
      settings: { emergency_keywords: ['flood'] },
      message: 'Help there is a flood in my kitchen',
    });
    expect(res.emergency).toBe(true);
    expect(res.intent).toBe('emergency');
    expect(res.readyToBook).toBe(false);
    expect(mockAiComplete).not.toHaveBeenCalled();
  });

  it('returns a conversational reply when not ready to book', async () => {
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({
        reply: 'Sure! What day works for you?',
        language: 'en',
        intent: 'booking',
        ready_to_book: false,
        booking: null,
      }),
    });

    const res = await runJennyAgent({
      supabase: makeSupabase(),
      companyId: 'c1',
      settings: { language: 'both' },
      message: 'I need lawn care',
    });

    expect(res.readyToBook).toBe(false);
    expect(res.booking).toBeNull();
    expect(res.reply).toContain('What day');
  });

  it('marks ready_to_book only when all required fields are present', async () => {
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({
        reply: 'Booked! Lawn Care on 2026-07-02 at 9 AM.',
        language: 'en',
        intent: 'booking',
        ready_to_book: true,
        booking: {
          customerName: 'Sarah',
          serviceName: 'Lawn Care',
          scheduledDate: '2026-07-02',
          scheduledTimeStart: '09:00',
          notes: 'half acre',
        },
      }),
    });

    const res = await runJennyAgent({
      supabase: makeSupabase(),
      companyId: 'c1',
      settings: {},
      message: 'Sarah, lawn care tomorrow at 9am',
    });

    expect(res.readyToBook).toBe(true);
    expect(res.booking.customerName).toBe('Sarah');
  });

  it('does NOT mark ready when the model omits a required field', async () => {
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({
        reply: 'What time?',
        language: 'en',
        intent: 'booking',
        ready_to_book: true, // model claims ready...
        booking: { customerName: 'Sarah', serviceName: 'Lawn Care', scheduledDate: '2026-07-02' }, // ...but no time
      }),
    });

    const res = await runJennyAgent({
      supabase: makeSupabase(),
      companyId: 'c1',
      settings: {},
      message: 'lawn care',
    });

    expect(res.readyToBook).toBe(false);
    expect(res.booking).toBeNull();
  });

  it('replies in Spanish when the customer writes Spanish', async () => {
    mockAiComplete.mockResolvedValue({
      content: JSON.stringify({
        reply: '¡Claro! ¿Qué día le gustaría?',
        language: 'es',
        intent: 'booking',
        ready_to_book: false,
        booking: null,
      }),
    });

    const res = await runJennyAgent({
      supabase: makeSupabase(),
      companyId: 'c1',
      settings: { language: 'both' },
      message: 'Hola, necesito servicio de jardinería',
    });

    expect(res.language).toBe('es');
  });

  it('falls back gracefully when the AI throws', async () => {
    mockAiComplete.mockRejectedValue(new Error('provider down'));

    const res = await runJennyAgent({
      supabase: makeSupabase(),
      companyId: 'c1',
      settings: {},
      message: 'hello',
    });

    expect(res.readyToBook).toBe(false);
    expect(typeof res.reply).toBe('string');
    expect(res.reply.length).toBeGreaterThan(0);
  });
});
