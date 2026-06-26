/**
 * @jest-environment node
 */

const { createBooking, calculateEndTime } = require('@/lib/booking-core');

// Minimal chainable Supabase stub driven by per-table handlers.
function makeSupabase({ existingJobs = [], existingCustomer = null, newJobId = 'job-1', newCustomerId = 'cust-1', companyName = 'Test Co' } = {}) {
  let jobCalls = 0;
  return {
    from(table) {
      if (table === 'jobs') {
        jobCalls++;
        const obj = {};
        obj.select = jest.fn(() => obj);
        obj.insert = jest.fn(() => obj);
        obj.eq = jest.fn(() => obj);
        obj.neq = jest.fn(() => (jobCalls === 1 ? { data: existingJobs, error: null } : obj));
        obj.single = jest.fn(() => ({ data: { id: newJobId }, error: null }));
        return obj;
      }
      if (table === 'customers') {
        const obj = {};
        obj.select = jest.fn(() => obj);
        obj.insert = jest.fn(() => obj);
        obj.update = jest.fn(() => obj);
        obj.eq = jest.fn(() => obj);
        obj.single = jest.fn(() => ({ data: existingCustomer || { id: newCustomerId }, error: null }));
        return obj;
      }
      if (table === 'leads') {
        return { insert: jest.fn(() => ({ data: null, error: null })) };
      }
      if (table === 'companies') {
        const obj = {};
        obj.select = jest.fn(() => obj);
        obj.eq = jest.fn(() => obj);
        obj.single = jest.fn(() => ({ data: { name: companyName }, error: null }));
        return obj;
      }
      return { select: jest.fn(() => ({ data: null, error: null })) };
    },
  };
}

const validParams = {
  companyId: 'company-1',
  serviceName: 'Lawn Mowing',
  scheduledDate: '2026-07-01',
  scheduledTimeStart: '10:00',
  customerName: 'Jane Doe',
  customerPhone: '5551234567',
};

describe('booking-core', () => {
  describe('calculateEndTime', () => {
    it('adds the duration to the start time', () => {
      expect(calculateEndTime('10:00', 90)).toBe('11:30');
    });
    it('defaults to 60 minutes when duration missing', () => {
      expect(calculateEndTime('09:00')).toBe('10:00');
    });
  });

  describe('createBooking', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await createBooking(makeSupabase(), { companyId: 'c1' });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('creates a booking and returns details', async () => {
      const res = await createBooking(makeSupabase(), validParams);
      expect(res.ok).toBe(true);
      expect(res.booking.service).toBe('Lawn Mowing');
      expect(res.booking.time).toBe('10:00');
      expect(res.leadCreated).toBe(true);
      expect(res.companyName).toBe('Test Co');
    });

    it('rejects a conflicting slot when autoAdvance is false', async () => {
      const res = await createBooking(
        makeSupabase({ existingJobs: [{ scheduled_time_start: '10:00' }] }),
        validParams
      );
      expect(res.ok).toBe(false);
      expect(res.status).toBe(409);
    });

    it('auto-advances past a conflict when autoAdvance is true', async () => {
      const res = await createBooking(
        makeSupabase({ existingJobs: [{ scheduled_time_start: '10:00' }] }),
        { ...validParams, autoAdvance: true }
      );
      expect(res.ok).toBe(true);
      expect(res.booking.time).not.toBe('10:00');
    });

    it('treats "booked via Jenny AI" notes as flexible', async () => {
      const res = await createBooking(
        makeSupabase({ existingJobs: [{ scheduled_time_start: '10:00' }] }),
        { ...validParams, notes: 'booked via Jenny AI SMS' }
      );
      expect(res.ok).toBe(true);
      expect(res.booking.time).not.toBe('10:00');
    });
  });
});
