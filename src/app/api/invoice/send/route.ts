import { NextResponse } from 'next/server';
import { sendInvoiceEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      to,
      customerName,
      invoiceNumber,
      items,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      total,
      dueDate,
      notes,
      invoiceLink,
      companyName,
    } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    if (!invoiceLink) {
      return NextResponse.json({ error: 'Invoice link required' }, { status: 400 });
    }

    const data = await sendInvoiceEmail({
      to,
      customerName: customerName || 'Customer',
      invoiceNumber,
      items,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      total,
      dueDate,
      notes,
      invoiceLink,
      companyName,
    });

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Invoice email API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send invoice email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
