import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    event = getStripe().webhooks.constructEvent(
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
  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerId = session.customer;
  const metadata = session.metadata;

  // Find the user by email to get their company_id
  const { data: existingUser } = await getSupabase()
    .from('users')
    .select('id, company_id')
    .eq('email', customerEmail)
    .single();

  if (existingUser?.company_id) {
    // Update the company's plan and stripe info
    const { error } = await getSupabase()
      .from('companies')
      .update({
        stripe_customer_id: customerId,
        plan: metadata.plan || 'starter',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.company_id);

    if (error) {
      console.error('Error updating company after checkout:', error.message);
    }
  } else {
    console.error('No user/company found for email:', customerEmail);
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
