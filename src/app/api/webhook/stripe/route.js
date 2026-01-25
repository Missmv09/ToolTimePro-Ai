import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy initialization to prevent build-time errors when env vars aren't available
let stripeClient = null;
let supabaseClient = null;

function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase environment variables are not configured');
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
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
  const supabase = getSupabase();
  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const metadata = session.metadata;

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .single();

  if (existingUser) {
    await supabase
      .from('users')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: metadata.plan,
        billing_cycle: metadata.billing,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id);
  } else {
    await supabase
      .from('users')
      .insert({
        email: customerEmail,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: metadata.plan,
        billing_cycle: metadata.billing,
        subscription_status: 'active',
        created_at: new Date().toISOString()
      });
  }
}

async function handleSubscriptionUpdate(subscription) {
  const supabase = getSupabase();
  await supabase
    .from('users')
    .update({
      subscription_status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionCanceled(subscription) {
  const supabase = getSupabase();
  await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(invoice) {
  const supabase = getSupabase();
  await supabase
    .from('payments')
    .insert({
      stripe_customer_id: invoice.customer,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      created_at: new Date().toISOString()
    });
}

async function handlePaymentFailed(invoice) {
  const supabase = getSupabase();
  await supabase
    .from('payments')
    .insert({
      stripe_customer_id: invoice.customer,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      created_at: new Date().toISOString()
    });

  await supabase
    .from('users')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', invoice.customer);
}
