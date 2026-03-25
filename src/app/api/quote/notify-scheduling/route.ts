import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSchedulingRequestEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      quoteId,
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

    // Validate that this is a real quote and the "to" email matches a company owner
    if (quoteId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: quote } = await supabase
          .from('quotes')
          .select('id, status, company_id')
          .eq('id', quoteId)
          .single();

        if (!quote) {
          return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Verify the "to" address belongs to an owner/admin of the company
        const { data: validRecipient } = await supabase
          .from('users')
          .select('id')
          .eq('company_id', quote.company_id)
          .eq('email', to)
          .in('role', ['owner', 'admin'])
          .single();

        if (!validRecipient) {
          return NextResponse.json({ error: 'Unauthorized recipient' }, { status: 403 });
        }
      }
    } else {
      return NextResponse.json({ error: 'Quote ID required' }, { status: 400 });
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
