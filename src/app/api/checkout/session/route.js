import Stripe from 'stripe';
import { NextResponse } from 'next/server';

// Lazy initialization to prevent build-time errors when env vars aren't available
let stripeClient = null;

function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      id: session.id,
      customer_email: session.customer_email || session.customer_details?.email,
      payment_status: session.payment_status,
      status: session.status,
      metadata: session.metadata,
      amount_total: session.amount_total,
      currency: session.currency
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
