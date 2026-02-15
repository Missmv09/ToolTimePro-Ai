import { NextResponse } from 'next/server';
import { sendQuoteEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      to,
      customerName,
      quoteNumber,
      items,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      total,
      validUntil,
      notes,
      quoteLink,
      companyName,
    } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    if (!quoteLink) {
      return NextResponse.json({ error: 'Quote link required' }, { status: 400 });
    }

    const data = await sendQuoteEmail({
      to,
      customerName: customerName || 'Customer',
      quoteNumber: quoteNumber || 'N/A',
      items,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      total,
      validUntil,
      notes,
      quoteLink,
      companyName,
    });

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Quote email API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send quote email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
