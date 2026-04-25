import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy initialization to avoid build-time errors when env vars aren't available
let stripe;
let supabase;

function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  // TEMP DEBUG — remove once webhook is verified working in sandbox
  console.log('[stripe-webhook] secret prefix:', webhookSecret.slice(0, 8), 'suffix:', webhookSecret.slice(-4), 'len:', webhookSecret.length);
  console.log('[stripe-webhook] body bytes:', body.length, 'sig header present:', !!signature);
  if (signature) console.log('[stripe-webhook] sig header sample:', signature.slice(0, 60));

  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      {
        error: 'Webhook signature verification failed',
        debug: {
          secretPrefix: webhookSecret.slice(0, 8),
          secretSuffix: webhookSecret.slice(-4),
          secretLength: webhookSecret.length,
          bodyLength: body.length,
          hasSigHeader: !!signature,
          sigHeaderStart: signature ? signature.slice(0, 40) : null,
          stripeError: err.message,
        },
      },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await handleCheckoutComplete(session);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await handleSubscriptionCanceled(subscription);
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      await handlePaymentSucceeded(invoice);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await handlePaymentFailed(invoice);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session) {
  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerId = session.customer;
  const metadata = session.metadata;
  const plan = metadata.plan || metadata.tier || metadata.standalone || '';
  const addons = metadata.addons ? metadata.addons.split(',').filter(Boolean) : [];

  // Find the user by email to get their company_id
  const { data: existingUser } = await getSupabase()
    .from('users')
    .select('id, company_id')
    .eq('email', customerEmail)
    .single();

  if (existingUser?.company_id) {
    // Build the update payload. We treat checkout.session.completed as the
    // moment the company becomes a paying subscriber — even when the session
    // started a Stripe-side trial, payment-method-on-file means we no longer
    // need to gate the dashboard on trial_ends_at.
    const skipTrial = metadata.skipTrial === 'true';
    const updateData = {
      stripe_customer_id: customerId,
      plan: plan || 'starter',
      subscription_status: skipTrial ? 'active' : 'trialing',
      updated_at: new Date().toISOString()
    };

    // Persist purchased addons (merge with any existing addons)
    if (addons.length > 0) {
      const { data: currentCompany } = await getSupabase()
        .from('companies')
        .select('addons')
        .eq('id', existingUser.company_id)
        .single();

      const existingAddons = currentCompany?.addons || [];
      const mergedAddons = [...new Set([...existingAddons, ...addons])];
      updateData.addons = mergedAddons;
    }

    // Update the company's plan, addons, and stripe info
    const { error } = await getSupabase()
      .from('companies')
      .update(updateData)
      .eq('id', existingUser.company_id);

    if (error) {
      console.error('Error updating company after checkout:', error.message);
    }
  } else {
    console.error('No user/company found for email:', customerEmail);
  }

  // Create setup service order if onboarding was purchased
  const onboarding = metadata.onboarding;
  if (onboarding && existingUser?.company_id && ['assisted_onboarding', 'white_glove'].includes(onboarding)) {
    try {
      await getSupabase()
        .from('setup_service_orders')
        .insert({
          company_id: existingUser.company_id,
          service_type: onboarding,
          status: 'pending',
          stripe_payment_intent_id: session.payment_intent || session.id,
          checklist: [],
          purchased_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Error creating setup service order:', err.message);
    }
  }

  // Send welcome/confirmation email
  if (customerEmail) {
    try {
      await sendWelcomeEmail({
        to: customerEmail,
        plan,
        billing: metadata.billing,
      });
    } catch (err) {
      console.error('Failed to send welcome email:', err.message);
    }
  }
}

async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;
  if (!customerId) return;

  // Map Stripe subscription status to plan — active means keep plan, else downgrade
  const planUpdate = subscription.status === 'active' ? {} : { plan: 'starter' };

  const { error } = await getSupabase()
    .from('companies')
    .update({
      ...planUpdate,
      subscription_status: subscription.status,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating subscription:', error.message);
  }
}

async function handleSubscriptionCanceled(subscription) {
  const customerId = subscription.customer;
  if (!customerId) return;

  const { error } = await getSupabase()
    .from('companies')
    .update({
      plan: 'starter',
      subscription_status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error handling subscription cancellation:', error.message);
  }
}

async function handlePaymentSucceeded(invoice) {
  // Find the company by stripe_customer_id to get company_id for payment record
  const { data: company } = await getSupabase()
    .from('companies')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (company) {
    const { error } = await getSupabase()
      .from('payments')
      .insert({
        company_id: company.id,
        amount: invoice.amount_paid / 100, // Stripe amounts are in cents
        payment_method: 'stripe',
        status: 'completed',
        notes: `Stripe invoice ${invoice.id}`,
        created_at: new Date().toISOString()
      });
    if (error) {
      console.error('Error recording payment:', error.message);
    }
  }
}

async function handlePaymentFailed(invoice) {
  const { data: company } = await getSupabase()
    .from('companies')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (company) {
    await getSupabase()
      .from('companies')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('id', company.id);

    const { error } = await getSupabase()
      .from('payments')
      .insert({
        company_id: company.id,
        amount: invoice.amount_due / 100,
        payment_method: 'stripe',
        status: 'failed',
        notes: `Failed: Stripe invoice ${invoice.id}`,
        created_at: new Date().toISOString()
      });
    if (error) {
      console.error('Error recording failed payment:', error.message);
    }
  }
}
