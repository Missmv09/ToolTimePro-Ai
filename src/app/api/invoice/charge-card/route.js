import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';
import { getStripe } from '@/lib/stripe';
import { chargeCardOnFile } from '@/lib/after-payment';

export const dynamic = 'force-dynamic';

// POST { invoiceId } — charge the invoice balance to the customer's card on
// file (saved with consent at Stripe Checkout). Contractor-only: the caller
// must belong to the invoice's company. Runs the same after-payment pipeline
// as a Checkout payment (receipt, review request, leads).
//
// .js on purpose: Stripe's PaymentIntent types trip TypeScript inference in
// route files (see CLAUDE.md).
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

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  try {
    const result = await chargeCardOnFile(supabase, stripe, { invoiceId, companyId: profile.company_id });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code || null, declineCode: result.declineCode || null },
        { status: result.status || 400 }
      );
    }
    return NextResponse.json({
      success: true,
      paymentIntentId: result.paymentIntentId,
      amount: result.amount,
      status: result.record.status,
      receipt: result.hooks?.receipt || null,
      reviewScheduled: result.hooks?.reviewScheduled || false,
    });
  } catch (err) {
    console.error('Charge card on file error:', err);
    return NextResponse.json({ error: 'Failed to charge card' }, { status: 500 });
  }
}
