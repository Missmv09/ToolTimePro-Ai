import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';
import { runAfterPaymentHooks } from '@/lib/after-payment';

export const dynamic = 'force-dynamic';

// POST { invoiceId, amount?, paymentMethod? } — send the receipt (email + SMS)
// and queue the review request for a payment recorded outside Stripe, e.g.
// the dashboard "Mark Paid" button for cash or check. Contractor-only.
//
// The receipt describes the most recent payments row for the invoice when one
// exists; otherwise the amount/method passed in (or the invoice total).
export async function POST(request) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const invoiceId = body?.invoiceId;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!invoiceId || !uuidRegex.test(invoiceId)) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  const supabase = createClient(url, key);

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', auth.user.id).single();
  if (!profile?.company_id) {
    return NextResponse.json({ error: 'No company for this user' }, { status: 403 });
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, company_id, customer_id, job_id, quote_id, invoice_number, total, amount_paid, status')
    .eq('id', invoiceId)
    .single();
  if (!invoice || invoice.company_id !== profile.company_id) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, payment_method, card_brand, card_last4, receipt_sent_at')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
    .limit(1);
  const latest = payments?.[0] || null;

  if (latest?.receipt_sent_at && !body?.force) {
    return NextResponse.json({ success: true, alreadySent: true });
  }

  const amount = Number(latest?.amount ?? body?.amount ?? invoice.total) || 0;
  const method = latest?.payment_method || body?.paymentMethod || 'manual';
  const paidInFull = invoice.status === 'paid' || (Number(invoice.amount_paid) || 0) >= (Number(invoice.total) || 0) - 0.005;

  try {
    const hooks = await runAfterPaymentHooks(supabase, {
      invoice,
      amount,
      paidInFull,
      paymentId: latest?.id || null,
      paymentMethod: ['stripe', 'card_on_file', 'cash', 'check', 'manual'].includes(method) ? method : 'other',
      card: latest?.card_last4 ? { brand: latest.card_brand, last4: latest.card_last4 } : null,
      kind: 'payment',
    });
    return NextResponse.json({ success: true, ...hooks });
  } catch (err) {
    console.error('Receipt send error:', err);
    return NextResponse.json({ error: 'Failed to send receipt' }, { status: 500 });
  }
}
