import {
  normalizeTime,
  formatTime,
  applyChange,
  isCustomerAffecting,
  buildProposal,
  RescheduleJob,
} from '@/lib/jenny-reschedule';

const job: RescheduleJob = {
  id: 'job1',
  scheduled_date: '2026-06-22',
  scheduled_time_start: '09:00:00',
  scheduled_time_end: '10:00:00',
  customerName: 'Maria Valencia Powell',
  title: 'Lawn service',
};

describe('jenny-reschedule', () => {
  describe('normalizeTime', () => {
    it('strips seconds and pads hours', () => {
      expect(normalizeTime('9:00:00')).toBe('09:00');
      expect(normalizeTime('14:30')).toBe('14:30');
      expect(normalizeTime(null)).toBeNull();
      expect(normalizeTime('garbage')).toBeNull();
    });
  });

  describe('formatTime', () => {
    it('formats 12-hour time', () => {
      expect(formatTime('09:00:00')).toBe('9:00 AM');
      expect(formatTime('14:00')).toBe('2:00 PM');
      expect(formatTime('00:15')).toBe('12:15 AM');
    });
  });

  describe('applyChange', () => {
    it('keeps existing values when not overridden', () => {
      const after = applyChange(job, { jobId: 'job1' });
      expect(after).toEqual({ date: '2026-06-22', start: '09:00', end: '10:00' });
    });
    it('applies provided new values', () => {
      const after = applyChange(job, { jobId: 'job1', newDate: '2026-06-23', newStartTime: '14:00' });
      expect(after.date).toBe('2026-06-23');
      expect(after.start).toBe('14:00');
    });
  });

  describe('isCustomerAffecting', () => {
    it('is true when the date changes', () => {
      expect(isCustomerAffecting(job, { date: '2026-06-23', start: '09:00', end: '10:00' })).toBe(true);
    });
    it('is true when the start time changes', () => {
      expect(isCustomerAffecting(job, { date: '2026-06-22', start: '14:00', end: '10:00' })).toBe(true);
    });
    it('is false when only the end time changes', () => {
      expect(isCustomerAffecting(job, { date: '2026-06-22', start: '09:00', end: '11:00' })).toBe(false);
    });
  });

  describe('buildProposal', () => {
    it('flags a date/time move as customer-affecting and needing confirmation', () => {
      const p = buildProposal(job, { jobId: 'job1', newStartTime: '14:00' }, 'Mint And Pink');
      expect(p.customerAffecting).toBe(true);
      expect(p.needsConfirmation).toBe(true);
      expect(p.customerMessage).toContain('rescheduled to');
      expect(p.customerMessage).toContain('2:00 PM');
      expect(p.customerMessage).toContain('Maria'); // greeting uses first name
      expect(p.summary).toContain('9:00 AM');
      expect(p.summary).toContain('2:00 PM');
    });

    it('does not require confirmation or message an end-time-only change', () => {
      const p = buildProposal(job, { jobId: 'job1', newEndTime: '11:00' }, 'Mint And Pink');
      expect(p.customerAffecting).toBe(false);
      expect(p.needsConfirmation).toBe(false);
      expect(p.customerMessage).toBeNull();
    });
  });
});
