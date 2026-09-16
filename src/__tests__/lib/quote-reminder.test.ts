/**
 * Tests for lib/quote-reminder — the eligibility rules and the send/stamp
 * path shared by the "Send Reminder" button and the quote_follow_up action.
 */

const mockSendSMS = jest.fn();
const mockSendEmail = jest.fn();
jest.mock('@/lib/twilio', () => ({ sendSMS: (...a: unknown[]) => mockSendSMS(...a) }));
jest.mock('@/lib/email', () => ({ sendQuoteReminderEmail: (...a: unknown[]) => mockSendEmail(...a) }));

import {
  resolveQuoteReminderConfig,
  quoteReminderDue,
  reminderChannels,
  isWithinSendWindow,
  localHour,
  renderReminderTemplate,
  sendQuoteReminder,
  type ReminderQuote,
} from '@/lib/quote-reminder';
import { DEFAULT_ACTION_CONFIGS } from '@/types/jenny-actions';

const { createQueryMock } = require('@/__mocks__/supabase-query-mock');

const NOW = new Date('2026-09-16T17:00:00Z'); // 10am Los Angeles
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const customer = { id: 'c1', name: 'Jane', phone: '+15551234567', email: 'jane@example.com', sms_consent: true };

function quote(overrides: Partial<ReminderQuote> = {}): ReminderQuote {
  return {
    id: '11111111-2222-4333-8444-555555555555',
    quote_number: 'Q-100',
    status: 'sent',
    total: 450,
    valid_until: '2026-10-16',
    sent_at: daysAgo(5),
    created_at: daysAgo(5),
    reminder_count: 0,
    last_reminder_at: null,
    customer,
    ...overrides,
  };
}

const cfg = resolveQuoteReminderConfig(DEFAULT_ACTION_CONFIGS.quote_follow_up);

describe('resolveQuoteReminderConfig', () => {
  it('uses the defaults when the row is empty', () => {
    expect(cfg.first_reminder_days).toBe(3);
    expect(cfg.reminder_interval_days).toBe(4);
    expect(cfg.max_reminders).toBe(2);
    expect(cfg.channel).toBe('both');
    expect(cfg.sms_template).toContain('{quote_link}');
  });

  it('clamps hand-edited nonsense so a config row cannot spam', () => {
    const r = resolveQuoteReminderConfig({ first_reminder_days: 0, reminder_interval_days: -3, max_reminders: 99, channel: 'carrier-pigeon', sms_template: '   ' });
    expect(r.first_reminder_days).toBe(1);
    expect(r.reminder_interval_days).toBe(1);
    expect(r.max_reminders).toBe(5);
    expect(r.channel).toBe('both');
    expect(r.sms_template).toBe(cfg.sms_template);
  });
});

describe('quoteReminderDue', () => {
  it('is due once the first wait has passed on an unanswered sent quote', () => {
    expect(quoteReminderDue(quote(), cfg, NOW)).toEqual({ due: true });
    expect(quoteReminderDue(quote({ status: 'viewed' }), cfg, NOW)).toEqual({ due: true });
  });

  it('waits the first interval after sending', () => {
    expect(quoteReminderDue(quote({ sent_at: daysAgo(2), created_at: daysAgo(2) }), cfg, NOW)).toEqual({ due: false, reason: 'too_soon' });
    expect(quoteReminderDue(quote({ sent_at: daysAgo(3), created_at: daysAgo(3) }), cfg, NOW)).toEqual({ due: true });
  });

  it('spaces later reminders from the last one, not from the send', () => {
    const q = quote({ sent_at: daysAgo(30), reminder_count: 1, last_reminder_at: daysAgo(2) });
    expect(quoteReminderDue(q, cfg, NOW)).toEqual({ due: false, reason: 'too_soon' });
    expect(quoteReminderDue({ ...q, last_reminder_at: daysAgo(4) }, cfg, NOW)).toEqual({ due: true });
  });

  it('stops at the cap, counting manual reminders too', () => {
    expect(quoteReminderDue(quote({ reminder_count: 2, last_reminder_at: daysAgo(10) }), cfg, NOW)).toEqual({ due: false, reason: 'max_reminders' });
  });

  it('never chases an answered or expired quote', () => {
    expect(quoteReminderDue(quote({ status: 'approved' }), cfg, NOW)).toEqual({ due: false, reason: 'status' });
    expect(quoteReminderDue(quote({ status: 'rejected' }), cfg, NOW)).toEqual({ due: false, reason: 'status' });
    expect(quoteReminderDue(quote({ status: 'draft' }), cfg, NOW)).toEqual({ due: false, reason: 'status' });
    expect(quoteReminderDue(quote({ valid_until: '2026-09-01' }), cfg, NOW)).toEqual({ due: false, reason: 'expired' });
  });

  it('skips customers it cannot reach', () => {
    expect(quoteReminderDue(quote({ customer: { ...customer, email: null, sms_consent: false } }), cfg, NOW)).toEqual({ due: false, reason: 'no_channel' });
    expect(quoteReminderDue(quote({ customer: null }), cfg, NOW)).toEqual({ due: false, reason: 'no_channel' });
  });
});

describe('reminderChannels', () => {
  it('only texts customers who opted in, and honours the channel setting', () => {
    expect(reminderChannels(customer, 'both')).toEqual({ sms: true, email: true });
    expect(reminderChannels({ ...customer, sms_consent: false }, 'both')).toEqual({ sms: false, email: true });
    expect(reminderChannels(customer, 'sms')).toEqual({ sms: true, email: false });
    expect(reminderChannels(customer, 'email')).toEqual({ sms: false, email: true });
    expect(reminderChannels({ ...customer, phone: null, email: null }, 'both')).toEqual({ sms: false, email: false });
  });
});

describe('send window', () => {
  it('reads the hour in the company time zone', () => {
    expect(localHour(new Date('2026-09-16T17:00:00Z'), 'America/Los_Angeles')).toBe(10);
    expect(localHour(new Date('2026-09-16T17:00:00Z'), 'America/New_York')).toBe(13);
    expect(localHour(new Date('2026-09-16T00:30:00Z'), 'UTC')).toBe(0);
  });

  it('allows 9am to 7pm local and nothing else', () => {
    expect(isWithinSendWindow(new Date('2026-09-16T16:00:00Z'), 'America/Los_Angeles')).toBe(true); // 9am
    expect(isWithinSendWindow(new Date('2026-09-16T15:59:00Z'), 'America/Los_Angeles')).toBe(false); // 8:59am
    expect(isWithinSendWindow(new Date('2026-09-17T01:59:00Z'), 'America/Los_Angeles')).toBe(true); // 6:59pm
    expect(isWithinSendWindow(new Date('2026-09-17T02:00:00Z'), 'America/Los_Angeles')).toBe(false); // 7pm
  });

  it('falls back to UTC on an unknown zone instead of throwing', () => {
    expect(() => isWithinSendWindow(NOW, 'Mars/Olympus_Mons')).not.toThrow();
  });
});

describe('renderReminderTemplate', () => {
  it('fills every placeholder', () => {
    const out = renderReminderTemplate(cfg.sms_template, {
      customer_name: 'Jane', company_name: 'Acme', total: '$450.00', quote_link: 'https://x/quote/1', phone: '555-0100',
    });
    expect(out).toContain('Jane');
    expect(out).toContain('Acme');
    expect(out).toContain('$450.00');
    expect(out).toContain('https://x/quote/1');
    expect(out).toContain('555-0100');
    expect(out).not.toMatch(/\{[a-z_]+\}/);
  });
});

describe('sendQuoteReminder', () => {
  const company = { id: 'co', name: 'Acme Plumbing', phone: '555-0100', timezone: 'America/Los_Angeles' };
  let sb: ReturnType<typeof createQueryMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendSMS.mockResolvedValue({ success: true, messageId: 'SM1' });
    mockSendEmail.mockResolvedValue({ id: 'em1' });
    sb = createQueryMock(() => ({ data: null, error: null }));
  });

  it('texts and emails, then stamps the quote and logs the contact', async () => {
    const res = await sendQuoteReminder({ supabase: sb as never, quote: quote(), company, config: cfg, source: 'jenny', baseUrl: 'https://app.test', now: NOW });
    expect(res).toMatchObject({ ok: true, sms: 'sent', email: 'sent', reminderNumber: 1 });

    expect(mockSendSMS).toHaveBeenCalledTimes(1);
    const smsBody = mockSendSMS.mock.calls[0][0].body as string;
    expect(smsBody).toContain('https://app.test/quote/11111111-2222-4333-8444-555555555555');
    expect(smsBody).toContain('$450.00');
    expect(smsBody).toContain('Acme Plumbing');

    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'jane@example.com', quoteNumber: 'Q-100', total: 450, reminderNumber: 1 }));

    const update = sb.calls.find((c: { table: string; op: string }) => c.table === 'quotes' && c.op === 'update');
    expect(update.payload).toMatchObject({ reminder_count: 1, last_reminder_at: NOW.toISOString(), last_followed_up_at: NOW.toISOString(), follow_up_date: '2026-09-20' });

    const log = sb.calls.find((c: { table: string; op: string }) => c.table === 'jenny_action_log' && c.op === 'insert');
    expect(log.payload).toMatchObject({ action_type: 'quote_follow_up', status: 'executed', target_id: quote().id, company_id: 'co' });
    expect(log.payload.metadata).toMatchObject({ source: 'jenny', sms: 'sent', email: 'sent', reminder_number: 1 });
  });

  it('skips the text for a customer without consent and still sends the email', async () => {
    const res = await sendQuoteReminder({ supabase: sb as never, quote: quote({ customer: { ...customer, sms_consent: false } }), company, config: cfg, source: 'manual', now: NOW });
    expect(res).toMatchObject({ ok: true, sms: 'skipped', email: 'sent' });
    expect(mockSendSMS).not.toHaveBeenCalled();
  });

  it('does not stamp the quote when nothing got through', async () => {
    mockSendSMS.mockResolvedValue({ success: false, error: 'Twilio down' });
    mockSendEmail.mockRejectedValue(new Error('Resend down'));
    const res = await sendQuoteReminder({ supabase: sb as never, quote: quote(), company, config: cfg, source: 'jenny', now: NOW });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Twilio down');
    expect(res.error).toContain('Resend down');
    expect(sb.calls.some((c: { table: string; op: string }) => c.table === 'quotes' && c.op === 'update')).toBe(false);
    expect(sb.calls.some((c: { table: string }) => c.table === 'jenny_action_log')).toBe(false);
  });

  it('counts a second reminder as number two and marks it the last', async () => {
    const res = await sendQuoteReminder({ supabase: sb as never, quote: quote({ reminder_count: 1, last_reminder_at: daysAgo(5) }), company, config: cfg, source: 'jenny', now: NOW });
    expect(res.reminderNumber).toBe(2);
    const log = sb.calls.find((c: { table: string; op: string }) => c.table === 'jenny_action_log' && c.op === 'insert');
    expect(log.payload.title).toContain('Reminder 2 of 2');
    expect(log.payload.description).toContain('last automatic reminder');
  });
});
