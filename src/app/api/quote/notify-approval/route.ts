import { NextResponse } from 'next/server';
import { sendQuoteApprovalEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      to,
      ownerName,
      quoteNumber,
      customerName,
      total,
      itemCount,
      submittedBy,
      dashboardLink,
    } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    const data = await sendQuoteApprovalEmail({
      to,
      ownerName: ownerName || 'Boss',
      quoteNumber: quoteNumber || 'N/A',
      customerName: customerName || 'Customer',
      total: total || 0,
      itemCount: itemCount || 0,
      submittedBy,
      dashboardLink: dashboardLink || '',
    });

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Quote approval notification email error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send approval notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
