import { NextResponse } from 'next/server';
import { sendSchedulingRequestEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      to,
      ownerName,
      quoteNumber,
      customerName,
      customerPhone,
      customerEmail,
      total,
      preferredContact,
      dashboardLink,
    } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    const data = await sendSchedulingRequestEmail({
      to,
      ownerName: ownerName || 'Boss',
      quoteNumber: quoteNumber || 'N/A',
      customerName: customerName || 'Customer',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      total: total || 0,
      preferredContact: preferredContact || 'Anytime',
      dashboardLink: dashboardLink || '',
    });

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Scheduling notification email error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send scheduling notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
