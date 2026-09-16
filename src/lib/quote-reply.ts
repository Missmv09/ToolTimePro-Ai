// Customer replies to quote reminders.
//
// When a customer texts back after a quote reminder, the Jenny SMS webhook
// asks this module first. If the customer has a quote "in play" (sent or
// viewed, reminded recently) and the text reads as a clear yes or a clear no,
// the quote is updated, the owner is alerted, the win or loss is logged to
// the Jenny feed, and the customer gets a short acknowledgement. Anything
// less clear is handed to the owner as a question, with the quote flagged
// for follow-up today, and Jenny does not try to book or negotiate.
//
// Only the two confident cases change a quote. When in doubt, a human decides.

import type { SupabaseClient } from '@supabase/supabase-js';

/** How recently a reminder must have gone out for a reply to be "about" it. */
export const QUOTE_REPLY_WINDOW_DAYS = 10;

export type QuoteReplyIntent = 'accept' | 'decline' | 'question' | 'unclear';

const NEGATION = /\b(not|no|don'?t|dont|can'?t|cant|won'?t|wont|never|isn'?t|but|however|unless|maybe|might|later|hold|wait)\b/i;

const ACCEPT_PHRASES = [
  'yes', 'yes please', 'yep', 'yeah', 'yea', 'ya', 'yup', 'sure', 'ok', 'okay', 'k',
  'approved', 'approve', 'approve it', 'accept', 'accepted', 'i accept', 'we accept',
  'sounds good', 'sounds great', 'looks good', 'good to go', "let's do it", 'lets do it', 'do it',
  'go ahead', 'go for it', 'book it', 'schedule it', "i'm in", 'im in', "we're in", 'were in',
  'confirm', 'confirmed', 'deal', 'works for me', 'perfect', 'great', 'absolutely', 'definitely',
  'si', 'sí', 'si por favor', 'sí por favor', 'dale', 'claro', 'de acuerdo', 'acepto', 'está bien', 'esta bien', 'adelante', 'perfecto',
];

const DECLINE_PHRASES = [
  'no', 'nope', 'nah', 'no thanks', 'no thank you', 'not interested', 'pass', "i'll pass", 'ill pass',
  'no longer need', 'no longer interested', 'went with someone else', 'going with someone else', 'went another way',
  'found someone else', 'decline', 'declined', 'cancel', 'cancel it', 'too expensive', 'too much', 'too high', "can't afford", 'cant afford',
  'not right now', 'not at this time', 'no gracias', 'no quiero', 'no me interesa', 'muy caro', 'demasiado caro',
];

const QUESTION_HINTS = /\b(call|question|when|how|what|why|price|cost|discount|cheaper|lower|schedule|available|availability|time|date|change|include|includes|warranty|payment|deposit|finance|llamar|cuando|cuándo|como|cómo|precio|descuento|cuanto|cuánto)\b/i;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((p) => text === p || text.startsWith(`${p} `) || text.endsWith(` ${p}`));
}

/**
 * Read a short reply as a yes, a no, a question, or noise.
 *
 * Conservative on purpose: "accept" and "decline" must be short, unambiguous
 * texts. "Yes but can you do it cheaper?" is a question, not a yes. Anything
 * with a question mark, a negation, or more than a few words goes to a human.
 */
export function classifyQuoteReply(raw: string): QuoteReplyIntent {
  const text = normalize(raw || '');
  if (!text) return 'unclear';
  const hasQuestionMark = /\?/.test(raw);
  const wordCount = text.split(' ').length;

  if (!hasQuestionMark && wordCount <= 6) {
    if (matchesPhrase(text, DECLINE_PHRASES)) return 'decline';
    if (!NEGATION.test(text) && matchesPhrase(text, ACCEPT_PHRASES)) return 'accept';
  }
  if (hasQuestionMark || QUESTION_HINTS.test(text)) return 'question';
  return 'unclear';
}

export interface InPlayQuote {
  id: string;
  quote_number: string | null;
  status: string;
  total: number | string | null;
  reminder_count: number | null;
  last_reminder_at: string | null;
  customer_id: string;
}

export interface QuoteReplyCustomer {
  id: string;
  name: string | null;
}

export interface QuoteReplyStrings {
  accepted: string;
  declined: string;
  passedOn: string;
}

const STRINGS: Record<'en' | 'es', (companyName: string, firstName: string) => QuoteReplyStrings> = {
  en: (company, first) => ({
    accepted: `Great news, thanks ${first}! ${company} will reach out shortly to get you scheduled.`,
    declined: `Understood, thanks for letting us know ${first}. If anything changes, ${company} is here to help.`,
    passedOn: `Thanks ${first}, I've passed your message to ${company}. Someone will get back to you shortly about your quote.`,
  }),
  es: (company, first) => ({
    accepted: `¡Excelente, gracias ${first}! ${company} se comunicará pronto para agendar el trabajo.`,
    declined: `Entendido, gracias por avisarnos ${first}. Si algo cambia, ${company} está para ayudarle.`,
    passedOn: `Gracias ${first}, ya pasé su mensaje a ${company}. Alguien le responderá pronto sobre su cotización.`,
  }),
};

export function quoteReplyStrings(lang: 'en' | 'es', companyName: string, customerName: string | null): QuoteReplyStrings {
  const first = (customerName || '').trim().split(' ')[0] || (lang === 'es' ? '' : 'there');
  return STRINGS[lang](companyName, first);
}

export function quoteLabelOf(quote: Pick<InPlayQuote, 'id' | 'quote_number'>): string {
  return quote.quote_number || `Q-${quote.id.slice(0, 8)}`;
}

export function formatQuoteTotal(total: number | string | null | undefined): string {
  const n = Number(total) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The customer's most recently reminded open quote, if any reminder is recent. */
export async function findQuoteInPlay(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
  now: Date = new Date(),
): Promise<InPlayQuote | null> {
  const since = new Date(now.getTime() - QUOTE_REPLY_WINDOW_DAYS * 86400000).toISOString();
  const { data } = await supabase
    .from('quotes')
    .select('id, quote_number, status, total, reminder_count, last_reminder_at, customer_id')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .in('status', ['sent', 'viewed'])
    .gte('last_reminder_at', since)
    .order('last_reminder_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as InPlayQuote | null) || null;
}

export interface HandleQuoteReplyArgs {
  supabase: SupabaseClient;
  companyId: string;
  companyName: string;
  customer: QuoteReplyCustomer;
  quote: InPlayQuote;
  body: string;
  lang: 'en' | 'es';
  now?: Date;
}

export interface HandleQuoteReplyResult {
  intent: QuoteReplyIntent;
  /** What to text back to the customer. */
  reply: string;
  /** Owner-facing summary, for the in-app notification and the escalation text. */
  ownerTitle: string;
  ownerMessage: string;
  ownerLink: string;
  notificationType: 'quote_accepted' | 'new_lead';
}

/**
 * Apply a classified reply to the quote in play.
 *
 * - accept   → quote approved (approved_at stamped), win logged, thread done
 * - decline  → quote rejected, loss logged with the customer's words
 * - question → quote left as is, flagged for follow-up today, owner gets the text
 */
export async function handleQuoteReply(args: HandleQuoteReplyArgs): Promise<HandleQuoteReplyResult> {
  const { supabase, companyId, companyName, customer, quote, body, lang } = args;
  const now = args.now || new Date();
  const nowIso = now.toISOString();
  const intent = classifyQuoteReply(body);
  const strings = quoteReplyStrings(lang, companyName, customer.name);
  const label = quoteLabelOf(quote);
  const total = formatQuoteTotal(quote.total);
  const name = customer.name || 'A customer';
  const quoted = `"${body.trim().slice(0, 140)}"`;

  const log = async (row: Record<string, unknown>) => {
    const { error } = await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'quote_follow_up',
      target_id: quote.id,
      target_type: 'quote',
      target_name: `Quote ${label} for ${name}`,
      executed_at: nowIso,
      ...row,
    });
    if (error) console.error(`[quote-reply] failed to log reply for quote ${quote.id}: ${error.message}`);
  };

  if (intent === 'accept') {
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'approved', approved_at: nowIso, follow_up_date: null, updated_at: nowIso })
      .eq('id', quote.id);
    if (error) console.error(`[quote-reply] failed to approve quote ${quote.id}: ${error.message}`);
    await log({
      title: `${name} accepted quote ${label} by text (${total})`,
      description: `${name} replied ${quoted} to reminder ${quote.reminder_count || 1}. Jenny marked the quote accepted and told them ${companyName} will reach out to schedule.`,
      status: 'executed',
      metadata: { outcome: 'accepted_by_reply', reply: body.slice(0, 280), reminder_count: quote.reminder_count || 0, total: Number(quote.total) || 0 },
    });
    return {
      intent,
      reply: strings.accepted,
      ownerTitle: lang === 'es' ? 'Cotización aceptada por texto' : 'Quote accepted by text',
      ownerMessage: `${name} accepted quote ${label} (${total}): ${quoted}. Reach out to schedule.`,
      ownerLink: '/dashboard/quotes?status=approved',
      notificationType: 'quote_accepted',
    };
  }

  if (intent === 'decline') {
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'rejected', follow_up_date: null, updated_at: nowIso })
      .eq('id', quote.id);
    if (error) console.error(`[quote-reply] failed to decline quote ${quote.id}: ${error.message}`);
    await log({
      title: `${name} declined quote ${label} by text (${total})`,
      description: `${name} replied ${quoted} to reminder ${quote.reminder_count || 1}. Jenny marked the quote declined; no more reminders will go out.`,
      status: 'executed',
      metadata: { outcome: 'declined_by_reply', reply: body.slice(0, 280), reminder_count: quote.reminder_count || 0, total: Number(quote.total) || 0 },
    });
    return {
      intent,
      reply: strings.declined,
      ownerTitle: lang === 'es' ? 'Cotización rechazada por texto' : 'Quote declined by text',
      ownerMessage: `${name} declined quote ${label} (${total}): ${quoted}.`,
      ownerLink: '/dashboard/quotes?status=rejected',
      notificationType: 'new_lead',
    };
  }

  // question / unclear: a human decides. Flag it for today so it surfaces in
  // Needs Follow-up, and stop the automatic reminders from talking over the owner.
  const today = nowIso.slice(0, 10);
  const { error } = await supabase
    .from('quotes')
    .update({ follow_up_date: today, updated_at: nowIso })
    .eq('id', quote.id);
  if (error) console.error(`[quote-reply] failed to flag quote ${quote.id}: ${error.message}`);
  await log({
    title: `${name} replied about quote ${label} — needs your answer`,
    description: `${name} replied ${quoted} to reminder ${quote.reminder_count || 1}. Jenny flagged the quote for follow-up today and told them you'll be in touch.`,
    status: 'pending',
    metadata: { outcome: 'needs_owner', reply: body.slice(0, 280), reminder_count: quote.reminder_count || 0, total: Number(quote.total) || 0 },
  });
  return {
    intent,
    reply: strings.passedOn,
    ownerTitle: lang === 'es' ? 'Respuesta sobre una cotización' : 'Reply about a quote',
    ownerMessage: `${name} replied about quote ${label} (${total}): ${quoted}`,
    ownerLink: '/dashboard/quotes?status=needs_follow_up',
    notificationType: 'new_lead',
  };
}
