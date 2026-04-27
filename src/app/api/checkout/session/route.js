import { NextResponse } from 'next/server';
import { getStripeForSession } from '@/lib/stripe-server';

export const dynamic = 'force-dynamic';

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
    const stripe = getStripeForSession(sessionId);
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
