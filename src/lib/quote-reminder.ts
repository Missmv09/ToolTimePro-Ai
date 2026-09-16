// Quote follow-up reminders.
//
// One implementation behind two entry points:
//   - the "Send Reminder" button on the Quotes page (POST /api/quote/remind)
//   - the quote_follow_up Jenny action in the 15-minute cron
//
// Both stamp the same bookkeeping on the quote (reminder_count,
// last_reminder_at, last_followed_up_at, follow_up_date) so a manual reminder
// and an automatic one share a single cooldown and a single cap, and both
// write a jenny_action_log row so the owner sees every customer contact in
// one feed.

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/twilio';
import { sendQuoteReminderEmail } from '@/lib/email';
import { DEFAULT_ACTION_CONFIGS, type QuoteFollowUpConfig } from '@/types/jenny-actions';

export const OPEN_QUOTE_STATUSES = ['sent', 'viewed'] as const;

/** Local-time window in which automatic reminders may go out. */
export const REMINDER_SEND_WINDOW = { startHour: 9, endHour: 19 };

const DAY_MS = 86400000;

export interface ReminderCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  sms_consent?: boolean | null;
}

export interface ReminderQuote {
  id: string;
  quote_number?: string | null;
  status: string;
  total: number | string | null;
  valid_until?: string | null;
  sent_at?: string | null;
  created_at: string;
  reminder_count?: number | null;
  last_reminder_at?: string | null;
  customer: ReminderCustomer | ReminderCustomer[] | null;
}

export interface ReminderCompany {
  id: string;
  name: string | null;
  phone?: string | null;
  timezone?: string | null;
}

export type ResolvedQuoteReminderConfig = Omit<QuoteFollowUpConfig, 'enabled'>;

const DEFAULTS = DEFAULT_ACTION_CONFIGS.quote_follow_up as unknown as QuoteFollowUpConfig;

/** Fill gaps and clamp nonsense so a hand-edited config row cannot spam. */
export function resolveQuoteReminderConfig(raw: Record<string, unknown> | null | undefined): ResolvedQuoteReminderConfig {
  const r = raw || {};
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(n)));
  };
  const channel = r.channel === 'sms' || r.channel === 'email' || r.channel === 'both' ? r.channel : DEFAULTS.channel;
  const template = typeof r.sms_template === 'string' && r.sms_template.trim() ? r.sms_template : DEFAULTS.sms_template;
  return {
    first_reminder_days: num(r.first_reminder_days, DEFAULTS.first_reminder_days, 1, 60),
    reminder_interval_days: num(r.reminder_interval_days, DEFAULTS.reminder_interval_days, 1, 60),
    max_reminders: num(r.max_reminders, DEFAULTS.max_reminders, 1, 5),
    max_per_run: num(r.max_per_run, DEFAULTS.max_per_run, 1, 200),
    channel,
    sms_template: template,
  };
}

export function customerOf(quote: ReminderQuote): ReminderCustomer | null {
  if (!quote.customer) return null;
  return Array.isArray(quote.customer) ? quote.customer[0] || null : quote.customer;
}

/** Hour of the day (0-23) in the given IANA timezone; UTC if the zone is unknown. */
export function localHour(now: Date, timezone: string | null | undefined): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    return Number.isFinite(hour) ? hour % 24 : now.getUTCHours();
  } catch {
    return now.getUTCHours();
  }
}

/** Automatic reminders only go out during the company's daytime. */
export function isWithinSendWindow(now: Date, timezone: string | null | undefined): boolean {
  const h = localHour(now, timezone);
  return h >= REMINDER_SEND_WINDOW.startHour && h < REMINDER_SEND_WINDOW.endHour;
}

/** Which channels a reminder can actually use for this customer. */
export function reminderChannels(customer: ReminderCustomer | null, channel: QuoteFollowUpConfig['channel']) {
  const sms = Boolean(customer?.phone && customer?.sms_consent === true) && channel !== 'email';
  const email = Boolean(customer?.email) && channel !== 'sms';
  return { sms, email };
}

export type ReminderSkipReason =
  | 'status'
  | 'max_reminders'
  | 'expired'
  | 'too_soon'
  | 'no_channel';

/**
 * Is this quote due for an automatic reminder right now?
 *
 * The clock starts at the last reminder, or at the send time when none has
 * gone out yet. The first wait and the gap between later reminders are
 * separate settings so an owner can nudge early and then back off.
 */
export function quoteReminderDue(
  quote: ReminderQuote,
  config: ResolvedQuoteReminderConfig,
  now: Date = new Date(),
): { due: true } | { due: false; reason: ReminderSkipReason } {
  if (!(OPEN_QUOTE_STATUSES as readonly string[]).includes(quote.status)) return { due: false, reason: 'status' };

  const count = Number(quote.reminder_count) || 0;
  if (count >= config.max_reminders) return { due: false, reason: 'max_reminders' };

  if (quote.valid_until) {
    const validUntil = new Date(`${quote.valid_until}T23:59:59`);
    if (!Number.isNaN(validUntil.getTime()) && validUntil < now) return { due: false, reason: 'expired' };
  }

  const anchorIso = quote.last_reminder_at || quote.sent_at || quote.created_at;
  const anchor = new Date(anchorIso);
  const daysSince = Number.isNaN(anchor.getTime()) ? Infinity : Math.floor((now.getTime() - anchor.getTime()) / DAY_MS);
  const needed = count === 0 ? config.first_reminder_days : config.reminder_interval_days;
  if (daysSince < needed) return { due: false, reason: 'too_soon' };

  const ch = reminderChannels(customerOf(quote), config.channel);
  if (!ch.sms && !ch.email) return { due: false, reason: 'no_channel' };

  return { due: true };
}

export function formatMoney(total: number | string | null | undefined): string {
  const n = Number(total) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderReminderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template,
  );
}

export function quoteLabel(quote: Pick<ReminderQuote, 'id' | 'quote_number'>): string {
  return quote.quote_number || `Q-${quote.id.slice(0, 8)}`;
}

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.taskiguana.com').replace(/\/$/, '');
}

export interface SendQuoteReminderArgs {
  supabase: SupabaseClient;
  quote: ReminderQuote;
  company: ReminderCompany;
  config: ResolvedQuoteReminderConfig;
  /** Who triggered it — shown in the Jenny feed. */
  source: 'manual' | 'jenny';
  baseUrl?: string;
  now?: Date;
}

export type ChannelOutcome = 'sent' | 'skipped' | 'failed';

export interface SendQuoteReminderResult {
  ok: boolean;
  sms: ChannelOutcome;
  email: ChannelOutcome;
  reminderNumber: number;
  error?: string;
}

/**
 * Send one reminder over every channel the customer allows, then stamp the
 * quote and log the contact. Nothing is stamped if no channel got through, so
 * a Twilio outage does not burn one of the customer's reminders.
 */
export async function sendQuoteReminder(args: SendQuoteReminderArgs): Promise<SendQuoteReminderResult> {
  const { supabase, quote, company, config, source } = args;
  const now = args.now || new Date();
  const customer = customerOf(quote);
  const channels = reminderChannels(customer, config.channel);
  const reminderNumber = (Number(quote.reminder_count) || 0) + 1;
  const quoteLink = `${args.baseUrl || siteBaseUrl()}/quote/${quote.id}`;
  const customerName = customer?.name || 'there';
  const companyName = company.name || 'Our team';
  const total = formatMoney(quote.total);

  let sms: ChannelOutcome = 'skipped';
  let email: ChannelOutcome = 'skipped';
  const errors: string[] = [];

  if (channels.sms && customer?.phone) {
    const body = renderReminderTemplate(config.sms_template, {
      customer_name: customerName,
      company_name: companyName,
      total,
      quote_link: quoteLink,
      phone: company.phone || '',
    });
    const res = await sendSMS({ to: customer.phone, body });
    sms = res.success ? 'sent' : 'failed';
    if (!res.success) errors.push(`SMS: ${res.error || 'failed'}`);
  }

  if (channels.email && customer?.email) {
    try {
      await sendQuoteReminderEmail({
        to: customer.email,
        customerName,
        quoteNumber: quoteLabel(quote),
        total: Number(quote.total) || 0,
        validUntil: quote.valid_until || undefined,
        quoteLink,
        companyName,
        companyPhone: company.phone || undefined,
        reminderNumber,
      });
      email = 'sent';
    } catch (err) {
      email = 'failed';
      errors.push(`Email: ${err instanceof Error ? err.message : 'failed'}`);
    }
  }

  if (sms !== 'sent' && email !== 'sent') {
    return {
      ok: false,
      sms,
      email,
      reminderNumber,
      error: errors.length ? errors.join('; ') : 'Customer has no reachable channel (needs an email, or a phone number with SMS consent)',
    };
  }

  const nextFollowUp = new Date(now.getTime() + config.reminder_interval_days * DAY_MS).toISOString().slice(0, 10);
  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      reminder_count: reminderNumber,
      last_reminder_at: now.toISOString(),
      last_followed_up_at: now.toISOString(),
      follow_up_date: nextFollowUp,
      updated_at: now.toISOString(),
    })
    .eq('id', quote.id);
  if (updateError) {
    // The customer was contacted; say so loudly rather than pretend otherwise.
    console.error(`[quote-reminder] sent reminder for quote ${quote.id} but failed to stamp it: ${updateError.message}`);
    errors.push(`Bookkeeping: ${updateError.message}`);
  }

  const via = [sms === 'sent' ? 'text' : null, email === 'sent' ? 'email' : null].filter(Boolean).join(' and ');
  const { error: logError } = await supabase.from('jenny_action_log').insert({
    company_id: company.id,
    action_type: 'quote_follow_up',
    title: `Reminder ${reminderNumber} of ${config.max_reminders} sent to ${customerName} for quote ${quoteLabel(quote)} (${total})`,
    description:
      source === 'jenny'
        ? `Jenny followed up by ${via} on the ${total} quote for ${customerName}, which had no response. ${reminderNumber >= config.max_reminders ? 'This was the last automatic reminder.' : `Next reminder in ${config.reminder_interval_days} days if there is still no answer.`}`
        : `You sent a reminder by ${via} for the ${total} quote to ${customerName}.`,
    status: 'executed',
    target_id: quote.id,
    target_type: 'quote',
    target_name: `Quote ${quoteLabel(quote)} for ${customerName}`,
    metadata: { source, sms, email, reminder_number: reminderNumber, quote_link: quoteLink, total: Number(quote.total) || 0 },
    executed_at: now.toISOString(),
  });
  if (logError) {
    console.error(`[quote-reminder] failed to log reminder for quote ${quote.id}: ${logError.message}`);
  }

  return { ok: true, sms, email, reminderNumber, error: errors.length ? errors.join('; ') : undefined };
}
