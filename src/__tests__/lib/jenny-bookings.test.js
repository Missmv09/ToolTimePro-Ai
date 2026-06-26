/**
 * @jest-environment node
 */

const { getUpcomingBookings, isDuplicate, rescheduleBooking, cancelBooking } = require('@/lib/jenny-bookings');

describe('jenny-bookings', () => {
  describe('isDuplicate', () => {
    const existing = [{ scheduled_date: '2026-07-02', scheduled_time_start: '09:00' }];
    it('flags an exact date+time match', () => {
      expect(isDuplicate(existing, '2026-07-02', '09:00')).toBe(true);
    });
    it('does not flag a different time', () => {
      expect(isDuplicate(existing, '2026-07-02', '10:00')).toBe(false);
    });
    it('does not flag a different day', () => {
      expect(isDuplicate(existing, '2026-07-03', '09:00')).toBe(false);
    });
    it('handles empty/undefined safely', () => {
      expect(isDuplicate(undefined, '2026-07-02', '09:00')).toBe(false);
    });
  });

  describe('getUpcomingBookings', () => {
    function makeSupabase({ customer, jobs }) {
      return {
        from(table) {
          const obj = {};
          obj.select = () => obj;
          obj.eq = () => obj;
          obj.ilike = () => obj;
          obj.gte = () => obj;
          obj.neq = () => obj;
          obj.order = () => obj;
          obj.limit = () => (table === 'jobs' ? Promise.resolve({ data: jobs }) : obj);
          obj.maybeSingle = () => Promise.resolve({ data: customer });
          return obj;
        },
      };
    }

    it('returns the customer\'s upcoming jobs', async () => {
      const jobs = [{ id: 'j1', title: 'Lawn Care', scheduled_date: '2026-07-02', scheduled_time_start: '09:00' }];
      const res = await getUpcomingBookings(makeSupabase({ customer: { id: 'c1' }, jobs }), 'co1', '7657895752');
      expect(res).toEqual(jobs);
    });

    it('returns [] when the customer is unknown', async () => {
      const res = await getUpcomingBookings(makeSupabase({ customer: null, jobs: [] }), 'co1', '7657895752');
      expect(res).toEqual([]);
    });

    it('returns [] for an empty phone', async () => {
      const res = await getUpcomingBookings(makeSupabase({ customer: { id: 'c1' }, jobs: [] }), 'co1', '');
      expect(res).toEqual([]);
    });
  });

  describe('rescheduleBooking', () => {
    it('updates the job with the new date/time and end time', async () => {
      const update = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) }));
      const supabase = { from: jest.fn(() => ({ update })) };
      const res = await rescheduleBooking(supabase, 'j1', { date: '2026-07-03', time: '10:00', durationMinutes: 60 });
      expect(res.ok).toBe(true);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ scheduled_date: '2026-07-03', scheduled_time_start: '10:00', scheduled_time_end: '11:00' })
      );
    });
  });

  describe('cancelBooking', () => {
    it('sets the job status to cancelled', async () => {
      const update = jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) }));
      const supabase = { from: jest.fn(() => ({ update })) };
      const res = await cancelBooking(supabase, 'j1');
      expect(res.ok).toBe(true);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    });
  });
});
