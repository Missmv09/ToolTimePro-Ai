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
  const plan = metadata.plan || metadata.tier || metadata.standalone || '';
  const addons = metadata.addons ? metadata.addons.split(',').filter(Boolean) : [];

  // Find the user by email to get their company_id
  const { data: existingUser } = await getSupabase()
    .from('users')
    .select('id, company_id')
    .eq('email', customerEmail)
    .single();

  if (existingUser?.company_id) {
    // Build the update payload
    const updateData = {
      stripe_customer_id: customerId,
      plan: plan || 'starter',
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
