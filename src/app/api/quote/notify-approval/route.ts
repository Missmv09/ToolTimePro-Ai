import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendQuoteApprovalEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      quoteId,
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

    // Validate that this is a real quote and the "to" email matches the company owner
    // This prevents using this endpoint to send arbitrary emails
    if (quoteId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: quote } = await supabase
          .from('quotes')
          .select('id, status, company:companies(email)')
          .eq('id', quoteId)
          .single();

        if (!quote) {
          return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Verify the "to" address matches the company email (prevent arbitrary email targets)
        const companyEmail = (quote.company as { email?: string } | null)?.email;
        if (companyEmail && to !== companyEmail) {
          return NextResponse.json({ error: 'Unauthorized recipient' }, { status: 403 });
        }
      }
    } else {
      // If no quoteId provided, require auth (dashboard context)
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
