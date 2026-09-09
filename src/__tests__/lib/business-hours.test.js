/**
 * @jest-environment node
 */

const {
  DEFAULT_BUSINESS_HOURS,
  normalizeBusinessHours,
  resolveBusinessHours,
  resolveTimezone,
  todayInTimezone,
  getDayHours,
  isOpenAt,
  slotsForDay,
  nextOpenDate,
  describeBusinessHours,
} = require('@/lib/business-hours');

describe('business-hours', () => {
  describe('normalizeBusinessHours', () => {
    it('accepts the Settings shape (short keys, missing day = closed)', () => {
      const out = normalizeBusinessHours({ mon: { open: '08:00', close: '17:00' }, sat: { open: '9:00', close: '13:00' } });
      expect(out).toEqual({ mon: { open: '08:00', close: '17:00' }, sat: { open: '09:00', close: '13:00' } });
    });

    it('accepts the booking_settings shape (long keys with enabled flag)', () => {
      const out = normalizeBusinessHours({
        monday: { open: '07:00', close: '15:00', enabled: true },
        tuesday: { open: '07:00', close: '15:00', enabled: false },
      });
      expect(out).toEqual({ mon: { open: '07:00', close: '15:00' } });
    });

    it('drops malformed entries and returns null when nothing is usable', () => {
      expect(normalizeBusinessHours({ mon: { open: '17:00', close: '08:00' } })).toBeNull();
      expect(normalizeBusinessHours({ funday: { open: '08:00', close: '17:00' } })).toBeNull();
      expect(normalizeBusinessHours(null)).toBeNull();
      expect(normalizeBusinessHours('{}')).toBeNull();
    });
  });

  it('resolveBusinessHours falls back to Mon–Fri 8–5', () => {
    expect(resolveBusinessHours(null)).toEqual(DEFAULT_BUSINESS_HOURS);
    expect(resolveBusinessHours({})).toEqual(DEFAULT_BUSINESS_HOURS);
  });

  it('resolveTimezone rejects garbage and keeps valid IANA names', () => {
    expect(resolveTimezone('America/Chicago')).toBe('America/Chicago');
    expect(resolveTimezone('Mars/Olympus')).toBe('America/Los_Angeles');
    expect(resolveTimezone(null)).toBe('America/Los_Angeles');
  });

  it('todayInTimezone reflects the tenant calendar day, not UTC', () => {
    // 2026-03-10T03:30Z is still the evening of March 9 in Los Angeles.
    const now = new Date('2026-03-10T03:30:00Z');
    expect(todayInTimezone('America/Los_Angeles', now)).toBe('2026-03-09');
    expect(todayInTimezone('Europe/London', now)).toBe('2026-03-10');
  });

  describe('isOpenAt', () => {
    const hours = { mon: { open: '08:00', close: '17:00' } };
    it('is open inside the window in the tenant timezone', () => {
      // Monday 2026-03-09 10:00 in Chicago = 15:00Z
      expect(isOpenAt(hours, 'America/Chicago', new Date('2026-03-09T15:00:00Z'))).toBe(true);
    });
    it('is closed after hours and on unlisted days', () => {
      expect(isOpenAt(hours, 'America/Chicago', new Date('2026-03-09T23:30:00Z'))).toBe(false); // 18:30 local
      expect(isOpenAt(hours, 'America/Chicago', new Date('2026-03-10T15:00:00Z'))).toBe(false); // Tuesday
    });
    it('a NY tenant at 9 AM local is open while the same instant is 6 AM Pacific', () => {
      const at = new Date('2026-03-09T14:00:00Z');
      expect(isOpenAt(hours, 'America/New_York', at)).toBe(true);
      expect(isOpenAt(hours, 'America/Los_Angeles', at)).toBe(false);
    });
  });

  it('getDayHours / slotsForDay / nextOpenDate honour the configured days', () => {
    const hours = { tue: { open: '09:00', close: '12:00' }, thu: { open: '13:00', close: '15:30' } };
    expect(getDayHours(hours, '2026-03-09')).toBeNull(); // Monday
    expect(slotsForDay(getDayHours(hours, '2026-03-10'))).toEqual(['09:00', '10:00', '11:00']);
    expect(slotsForDay(getDayHours(hours, '2026-03-12'), 30)).toEqual(['13:00', '13:30', '14:00', '14:30', '15:00']);
    expect(nextOpenDate(hours, '2026-03-10')).toBe('2026-03-12');
    expect(nextOpenDate({ }, '2026-03-10')).toBeNull();
  });

  it('describeBusinessHours collapses identical consecutive days', () => {
    const hours = {
      mon: { open: '08:00', close: '17:00' },
      tue: { open: '08:00', close: '17:00' },
      wed: { open: '08:00', close: '17:00' },
      thu: { open: '08:00', close: '17:00' },
      fri: { open: '08:00', close: '17:00' },
      sat: { open: '09:00', close: '13:30' },
    };
    expect(describeBusinessHours(hours)).toBe('Mon–Fri 8 AM–5 PM, Sat 9 AM–1:30 PM');
  });
});
