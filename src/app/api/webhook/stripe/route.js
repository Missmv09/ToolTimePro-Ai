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
  const metadata = session.metadata || {};
  const clientReferenceId = session.client_reference_id || null;
  const plan = metadata.plan || metadata.tier || metadata.standalone || '';
  const addons = metadata.addons ? metadata.addons.split(',').filter(Boolean) : [];

  // Resolve the company through a priority chain so we don't lose track of the
  // account when a user enters a different billing email at Stripe Checkout:
  //   1. session.client_reference_id (Stripe's standard idiom)
  //   2. metadata.companyId (forwarded by /api/checkout when the user is logged in)
  //   3. metadata.userEmail or customer_email matched against users.email
  //   4. matched against companies.email (canonical, set by handle_new_signup)
  //   5. Stripe Customer's own metadata (last-ditch — recovers from a previous
  //      successful checkout that wrote the company id back)
  let resolvedCompanyId = null;
  let resolutionSource = null;

  if (clientReferenceId) {
    const { data } = await getSupabase()
      .from('companies')
      .select('id')
      .eq('id', clientReferenceId)
      .single();
    if (data?.id) {
      resolvedCompanyId = data.id;
      resolutionSource = 'client_reference_id';
    }
  }

  if (!resolvedCompanyId && metadata.companyId) {
    const { data } = await getSupabase()
      .from('companies')
      .select('id')
      .eq('id', metadata.companyId)
      .single();
    if (data?.id) {
      resolvedCompanyId = data.id;
      resolutionSource = 'metadata.companyId';
    }
  }

  const lookupEmail = metadata.userEmail || customerEmail;

  if (!resolvedCompanyId && lookupEmail) {
    const { data: existingUser } = await getSupabase()
      .from('users')
      .select('id, company_id')
      .eq('email', lookupEmail)
      .single();
    if (existingUser?.company_id) {
      resolvedCompanyId = existingUser.company_id;
      resolutionSource = 'users.email';
    }
  }

  if (!resolvedCompanyId && lookupEmail) {
    const { data: existingCompany } = await getSupabase()
      .from('companies')
      .select('id')
      .eq('email', lookupEmail)
      .single();
    if (existingCompany?.id) {
      resolvedCompanyId = existingCompany.id;
      resolutionSource = 'companies.email';
    }
  }

  if (!resolvedCompanyId && customerId) {
    try {
      const stripeCustomer = await getStripe().customers.retrieve(customerId);
      const stripeCompanyId = stripeCustomer && !stripeCustomer.deleted
        ? stripeCustomer.metadata?.companyId
        : null;
      if (stripeCompanyId) {
        const { data } = await getSupabase()
          .from('companies')
          .select('id')
          .eq('id', stripeCompanyId)
          .single();
        if (data?.id) {
          resolvedCompanyId = data.id;
          resolutionSource = 'stripe_customer.metadata';
        }
      }
    } catch (err) {
      console.error('Failed to fetch Stripe customer for fallback resolution:', err.message);
    }
  }

  if (resolvedCompanyId) {
    // Treat checkout.session.completed as the moment the company becomes a
    // paying subscriber — even when the session started a Stripe-side trial,
    // payment-method-on-file means we no longer need to gate on trial_ends_at.
    const skipTrial = metadata.skipTrial === 'true';
    const updateData = {
      stripe_customer_id: customerId,
      plan: plan || 'starter',
      subscription_status: skipTrial ? 'active' : 'trialing',
      updated_at: new Date().toISOString()
    };

    if (addons.length > 0) {
      const { data: currentCompany } = await getSupabase()
        .from('companies')
        .select('addons')
        .eq('id', resolvedCompanyId)
        .single();

      const existingAddons = currentCompany?.addons || [];
      updateData.addons = [...new Set([...existingAddons, ...addons])];
    }

    const { error } = await getSupabase()
      .from('companies')
      .update(updateData)
      .eq('id', resolvedCompanyId);

    if (error) {
      console.error('Error updating company after checkout:', error.message, {
        sessionId: session.id,
        resolvedCompanyId,
        resolutionSource,
      });
    } else {
      console.info('Company updated after checkout', {
        sessionId: session.id,
        resolvedCompanyId,
        resolutionSource,
        plan: updateData.plan,
        stripeCustomerId: customerId,
      });
    }

    // Persist company id back to the Stripe Customer so any future event on
    // this customer can be resolved to the same company even if our local DB
    // pointers go stale.
    if (customerId) {
      try {
        await getStripe().customers.update(customerId, {
          metadata: { companyId: resolvedCompanyId },
        });
      } catch (err) {
        console.error('Failed to write companyId back to Stripe customer:', err.message);
      }
    }
  } else {
    console.error('No company found for checkout session — DB not updated', {
      sessionId: session.id,
      stripeCustomerId: customerId,
      clientReferenceId,
      metadataCompanyId: metadata.companyId || null,
      metadataUserEmail: metadata.userEmail || null,
      customerEmail,
      lookupEmailUsed: lookupEmail || null,
    });
  }

  const onboarding = metadata.onboarding;
  if (onboarding && resolvedCompanyId && ['assisted_onboarding', 'white_glove'].includes(onboarding)) {
    try {
      await getSupabase()
        .from('setup_service_orders')
        .insert({
          company_id: resolvedCompanyId,
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

  // Only sync subscription_status here. The plan is set by checkout.session.completed
  // and cleared by customer.subscription.deleted (handleSubscriptionCanceled).
  // Resetting plan on any non-active status would clobber 'elite'/'pro' to 'starter'
  // during the normal trialing/past_due/incomplete states.
  const { error } = await getSupabase()
    .from('companies')
    .update({
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
