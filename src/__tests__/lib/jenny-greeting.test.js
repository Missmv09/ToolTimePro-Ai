/**
 * @jest-environment node
 */

const { pickGreeting } = require('@/lib/jenny-greeting');

const company = {
  name: 'Roof Co',
  timezone: 'America/Chicago',
  business_hours: { mon: { open: '08:00', close: '17:00' } },
};

// Monday 2026-03-09: 10:00 Chicago = 15:00Z (open); 19:00 Chicago = 00:00Z next day (closed)
const OPEN_AT = new Date('2026-03-09T15:00:00Z');
const CLOSED_AT = new Date('2026-03-10T00:00:00Z');

describe('Jenny Pro voice greeting selection', () => {
  it('speaks the tenant business-hours greeting when open', () => {
    const settings = { business_hours_greeting: 'Thanks for calling Roof Co, how can we help?', after_hours_greeting: 'We are closed.' };
    const out = pickGreeting({ settings, company, lang: 'en', now: OPEN_AT });
    expect(out.open).toBe(true);
    expect(out.isCustom).toBe(true);
    expect(out.greeting).toBe('Thanks for calling Roof Co, how can we help?');
  });

  it('speaks the after-hours greeting when closed', () => {
    const settings = { business_hours_greeting: 'Open greeting', after_hours_greeting: 'We are closed, leave details.' };
    const out = pickGreeting({ settings, company, lang: 'en', now: CLOSED_AT });
    expect(out.open).toBe(false);
    expect(out.greeting).toBe('We are closed, leave details.');
  });

  it('falls back to the built-in template when the relevant greeting is blank', () => {
    const settings = { business_hours_greeting: '   ', after_hours_greeting: null };
    const open = pickGreeting({ settings, company, lang: 'en', now: OPEN_AT });
    const closed = pickGreeting({ settings, company, lang: 'es', now: CLOSED_AT });
    expect(open.isCustom).toBe(false);
    expect(open.greeting).toContain('Roof Co');
    expect(closed.greeting).toContain('Gracias por llamar a Roof Co');
  });

  it('uses the tenant timezone, not Pacific, to decide open vs closed', () => {
    // 08:30 Eastern on a Monday = 13:30Z; that is 05:30 Pacific (closed there).
    const eastern = { ...company, timezone: 'America/New_York' };
    const settings = { business_hours_greeting: 'OPEN', after_hours_greeting: 'CLOSED' };
    expect(pickGreeting({ settings, company: eastern, lang: 'en', now: new Date('2026-03-09T13:30:00Z') }).greeting).toBe('OPEN');
    expect(pickGreeting({ settings, company: { ...company, timezone: 'America/Los_Angeles' }, lang: 'en', now: new Date('2026-03-09T13:30:00Z') }).greeting).toBe('CLOSED');
  });
});
