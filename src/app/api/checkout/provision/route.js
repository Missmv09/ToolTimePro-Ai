import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeForSession } from '@/lib/stripe-server';
import { autoCreateCompanyForCheckout } from '@/lib/auto-provision';

export const dynamic = 'force-dynamic';

// Fallback account provisioning, triggered by the /checkout/success page.
//
// Normally the Stripe webhook (checkout.session.completed) provisions the
// company and emails a login/set-password link. But the webhook is a single
// point of failure: if STRIPE_WEBHOOK_SECRET is wrong or the endpoint isn't
// registered in Stripe, the buyer pays and then NOTHING happens — no account,
// no email. The success page is a guaranteed client touchpoint right after
// payment, so we re-run provisioning here as a safety net.
//
// Idempotent: if a company already exists for the checkout email (i.e. the
// webhook already handled it), we do nothing and return early so we never
// send a duplicate email.
export async function POST(request) {
  let sessionId;
  try {
    const body = await request.json();
    sessionId = body?.session_id;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  try {
    const stripe = getStripeForSession(sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Only provision once the customer has actually paid (or started a
    // payment-method-backed trial). Guards against provisioning on an
    // abandoned/unpaid session id.
    const paid =
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required' ||
      session.status === 'complete';
    if (!paid) {
      return NextResponse.json({ status: 'not_paid' }, { status: 200 });
    }

    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      return NextResponse.json({ status: 'no_email' }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, serviceKey);

    // Give the Stripe webhook a head start. When the webhook is healthy it
    // provisions the company and sends the login email within a few seconds;
    // if we provisioned immediately we'd race it and the loser would send a
    // SECOND, conflicting email (the plain "Welcome — Go to Dashboard" one),
    // which dumps new buyers on the dashboard instead of set-password. So we
    // poll for an existing company across a short grace window and only fall
    // through to provisioning here if nothing appears — i.e. the webhook
    // genuinely didn't fire. Kept well under the serverless timeout.
    const GRACE_ATTEMPTS = 4;
    const GRACE_DELAY_MS = 2000;
    for (let attempt = 0; attempt < GRACE_ATTEMPTS; attempt++) {
      const { data: existingCompany } = await admin
        .from('companies')
        .select('id')
        .ilike('email', email)
        .maybeSingle();
      if (existingCompany?.id) {
        // A company exists, but if it has no auth-backed user row it's an
        // orphan (login deleted or never finished) — fall through to autoCreate
        // below, which heals the account and emails a set-password link.
        // Otherwise the webhook (or a prior run) already handled it: do nothing.
        const { data: companyUsers } = await admin
          .from('users')
          .select('id')
          .eq('company_id', existingCompany.id)
          .limit(1);
        if (companyUsers && companyUsers.length > 0) {
          return NextResponse.json({ status: 'already_provisioned' }, { status: 200 });
        }
        break; // orphaned company — heal it via autoCreate below
      }
      if (attempt < GRACE_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, GRACE_DELAY_MS));
      }
    }

    const metadata = session.metadata || {};
    const plan = metadata.plan || metadata.tier || metadata.standalone || 'starter';
    const addons = metadata.addons ? metadata.addons.split(',').filter(Boolean) : [];
    const skipTrial = metadata.skipTrial === 'true';
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (() => {
        try {
          return new URL(request.url).origin;
        } catch {
          return null;
        }
      })() ||
      'https://tooltimepro.com';

    const result = await autoCreateCompanyForCheckout({
      email,
      fullName: session.customer_details?.name || '',
      plan,
      addons,
      stripeCustomerId: session.customer,
      skipTrial,
      baseUrl,
    });

    if (result.error) {
      console.error('Success-page provisioning failed', {
        sessionId,
        email,
        error: result.error,
      });
      // Still 200 so the success page doesn't show a scary error — the user
      // has paid. They can recover via /auth/login (magic link) if needed.
      return NextResponse.json(
        { status: 'provision_error', error: result.error },
        { status: 200 }
      );
    }

    console.info('Company provisioned from success page (webhook fallback)', {
      sessionId,
      companyId: result.companyId,
      email,
    });
    return NextResponse.json({ status: 'provisioned' }, { status: 200 });
  } catch (error) {
    console.error('Provision endpoint error:', { sessionId, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
