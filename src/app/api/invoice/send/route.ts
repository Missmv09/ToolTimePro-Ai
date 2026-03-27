import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendInvoiceEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // Require auth - only authenticated company users can send invoices
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

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
