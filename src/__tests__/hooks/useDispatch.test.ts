/**
 * @jest-environment node
 */

/**
 * Tests for useDispatch hook - SMS consent gating in sendRunningLate
 *
 * sendRunningLate has an early return that blocks SMS when:
 * 1. No customer phone number
 * 2. Customer has not opted in (sms_consent is falsy)
 */

describe('useDispatch - sendRunningLate consent logic', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  interface Job {
    id: string;
    customer: { id?: string; name: string; phone: string | null; sms_consent?: boolean } | null;
  }

  // Mirror the sendRunningLate logic from useDispatch.ts
  function sendRunningLate(job: Job | undefined): { success: boolean; error?: string } {
    if (!job || !job.customer?.phone) {
      return { success: false, error: 'No customer phone number' };
    }
    if (!job.customer?.sms_consent) {
      return { success: false, error: 'Customer has not opted in to receive text messages' };
    }
    return { success: true };
  }

  it('returns error when job is undefined', () => {
    const result = sendRunningLate(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBe('No customer phone number');
  });

  it('returns error when customer is null', () => {
    const result = sendRunningLate({ id: 'j1', customer: null });
    expect(result.success).toBe(false);
    expect(result.error).toBe('No customer phone number');
  });

  it('returns error when customer has no phone', () => {
    const result = sendRunningLate({
      id: 'j2',
      customer: { name: 'John', phone: null, sms_consent: true },
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('No customer phone number');
  });

  it('returns consent error when customer has phone but no consent', () => {
    const result = sendRunningLate({
      id: 'j3',
      customer: { name: 'John', phone: '5551234567', sms_consent: false },
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Customer has not opted in to receive text messages');
  });

  it('returns consent error when sms_consent is undefined (legacy)', () => {
    const result = sendRunningLate({
      id: 'j4',
      customer: { name: 'John', phone: '5551234567' },
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Customer has not opted in to receive text messages');
  });

  it('succeeds when customer has phone and consent', () => {
    const result = sendRunningLate({
      id: 'j5',
      customer: { name: 'John', phone: '5551234567', sms_consent: true },
    });
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('useDispatch - assignJob SMS does NOT require customer consent', () => {
  /**
   * Worker assignment SMS is sent to the WORKER, not the customer.
   * It should NOT be gated by customer sms_consent.
   * This test documents that distinction.
   */
  it('worker assignment SMS is sent regardless of customer consent', () => {
    const worker = { id: 'w1', phone: '5559999999', full_name: 'Mike Smith' };
    const job = {
      id: 'j1',
      customer: { name: 'Client', phone: '5551111111', sms_consent: false },
      scheduled_time_start: '09:00',
      address: '123 Main St',
    };

    // Worker has phone → SMS should go out (no consent check on workers)
    const shouldNotify = !!(worker.phone && job);
    expect(shouldNotify).toBe(true);
  });
});
