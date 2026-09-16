/**
 * Tests for lib/quote-reply — reading a customer's text reply to a quote
 * reminder and applying it to the quote.
 */

import {
  classifyQuoteReply,
  handleQuoteReply,
  findQuoteInPlay,
  quoteReplyStrings,
  QUOTE_REPLY_WINDOW_DAYS,
  type InPlayQuote,
} from '@/lib/quote-reply';

const { createQueryMock } = require('@/__mocks__/supabase-query-mock');

describe('classifyQuoteReply', () => {
  const accept = ['yes', 'Yes!', 'YES please', 'yep', 'sure', 'ok', 'Okay.', 'Approved', 'sounds good', "Let's do it", 'go ahead', 'book it', "I'm in", 'Si', 'sí', 'dale', 'de acuerdo', 'acepto'];
  const decline = ['no', 'No thanks', 'not interested', 'pass', 'went with someone else', 'too expensive', "can't afford it right now", 'No gracias', 'muy caro'];
  const question = ['Yes but can you do it cheaper?', 'Can you call me?', 'What does it include?', 'when can you start', 'Is there a discount', 'How much is the deposit', 'Cuándo pueden venir'];
  const unclear = ['', 'thanks', 'ok so my neighbor also wants a quote for their yard and fence', 'Not sure yet', 'maybe next month'];

  it.each(accept)('reads "%s" as accept', (text) => {
    expect(classifyQuoteReply(text)).toBe('accept');
  });

  it.each(decline)('reads "%s" as decline', (text) => {
    expect(classifyQuoteReply(text)).toBe('decline');
  });

  it.each(question)('reads "%s" as a question for the owner', (text) => {
    expect(classifyQuoteReply(text)).toBe('question');
  });

  it.each(unclear)('leaves "%s" to a human', (text) => {
    expect(classifyQuoteReply(text)).toBe('unclear');
  });

  it('never accepts on a negated or hedged yes', () => {
    expect(classifyQuoteReply('yes but not now')).not.toBe('accept');
    expect(classifyQuoteReply('ok maybe')).not.toBe('accept');
    expect(classifyQuoteReply('sure, hold on')).not.toBe('accept');
  });
});

describe('quoteReplyStrings', () => {
  it('uses the first name and the company in both languages', () => {
    const en = quoteReplyStrings('en', 'Acme Plumbing', 'Jane Customer');
    expect(en.accepted).toContain('Jane');
    expect(en.accepted).toContain('Acme Plumbing');
    const es = quoteReplyStrings('es', 'Acme Plumbing', 'Jane Customer');
    expect(es.accepted).toContain('Jane');
    expect(es.accepted).toMatch(/agendar/);
  });

  it('copes with a missing name', () => {
    expect(quoteReplyStrings('en', 'Acme', null).passedOn).toContain('Thanks there');
  });
});

describe('findQuoteInPlay', () => {
  it('asks for the most recently reminded open quote inside the window', async () => {
    const NOW = new Date('2026-09-16T17:00:00Z');
    const sb = createQueryMock(() => ({ data: { id: 'q1', status: 'sent' }, error: null }));
    const q = await findQuoteInPlay(sb as never, 'co', 'cust', NOW);
    expect(q).toMatchObject({ id: 'q1' });
    const call = sb.calls[0];
    expect(call.table).toBe('quotes');
    const f = (name: string, col?: string) => call.filters.find((x: { name: string; args: unknown[] }) => x.name === name && (col === undefined || x.args[0] === col));
    expect(f('eq', 'company_id').args[1]).toBe('co');
    expect(f('eq', 'customer_id').args[1]).toBe('cust');
    expect(f('in', 'status').args[1]).toEqual(['sent', 'viewed']);
    expect(f('gte', 'last_reminder_at').args[1]).toBe(new Date(NOW.getTime() - QUOTE_REPLY_WINDOW_DAYS * 86400000).toISOString());
    expect(f('limit').args[0]).toBe(1);
  });
});

describe('handleQuoteReply', () => {
  const NOW = new Date('2026-09-16T17:00:00Z');
  const customer = { id: 'cust', name: 'Jane Customer' };
  const quote: InPlayQuote = { id: '11111111-2222-4333-8444-555555555555', quote_number: 'Q-42', status: 'sent', total: 1250, reminder_count: 1, last_reminder_at: '2026-09-14T17:00:00Z', customer_id: 'cust' };
  let sb: ReturnType<typeof createQueryMock>;

  beforeEach(() => {
    sb = createQueryMock(() => ({ data: null, error: null }));
  });

  const run = (body: string, lang: 'en' | 'es' = 'en') =>
    handleQuoteReply({ supabase: sb as never, companyId: 'co', companyName: 'Acme', customer, quote, body, lang, now: NOW });

  const quoteUpdate = () => sb.calls.find((c: { table: string; op: string }) => c.table === 'quotes' && c.op === 'update')?.payload;
  const logRow = () => sb.calls.find((c: { table: string; op: string }) => c.table === 'jenny_action_log' && c.op === 'insert')?.payload;

  it('accepts the quote on a clear yes, logs the win, and confirms to the customer', async () => {
    const r = await run('Yes please');
    expect(r.intent).toBe('accept');
    expect(quoteUpdate()).toMatchObject({ status: 'approved', approved_at: NOW.toISOString(), follow_up_date: null });
    expect(logRow()).toMatchObject({ action_type: 'quote_follow_up', status: 'executed', target_id: quote.id });
    expect(logRow().title).toContain('accepted quote Q-42');
    expect(logRow().title).toContain('$1,250.00');
    expect(logRow().metadata).toMatchObject({ outcome: 'accepted_by_reply', reply: 'Yes please' });
    expect(r.reply).toContain('Great news');
    expect(r.notificationType).toBe('quote_accepted');
    expect(r.ownerMessage).toContain('Jane Customer accepted quote Q-42');
    expect(r.ownerLink).toContain('approved');
  });

  it('declines the quote on a clear no and records the customer words', async () => {
    const r = await run('No thanks, went with someone else');
    expect(r.intent).toBe('decline');
    expect(quoteUpdate()).toMatchObject({ status: 'rejected', follow_up_date: null });
    expect(logRow().metadata).toMatchObject({ outcome: 'declined_by_reply' });
    expect(r.reply).toContain('Understood');
    expect(r.ownerMessage).toContain('declined');
  });

  it('flags a question for today and does not touch the status', async () => {
    const r = await run('Yes but can you do it cheaper?');
    expect(r.intent).toBe('question');
    expect(quoteUpdate()).toEqual(expect.objectContaining({ follow_up_date: '2026-09-16' }));
    expect(quoteUpdate().status).toBeUndefined();
    expect(logRow()).toMatchObject({ status: 'pending' });
    expect(logRow().metadata).toMatchObject({ outcome: 'needs_owner' });
    expect(r.reply).toContain("passed your message");
    expect(r.ownerLink).toContain('needs_follow_up');
  });

  it('answers in Spanish when the customer wrote in Spanish', async () => {
    const r = await run('Sí', 'es');
    expect(r.intent).toBe('accept');
    expect(r.reply).toMatch(/Excelente/);
    expect(r.ownerTitle).toMatch(/aceptada/);
  });
});
