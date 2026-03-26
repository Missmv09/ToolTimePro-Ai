import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

// Called when a customer views their quote for the first time
// Sends a real-time SMS alert to the company owner

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
  try {
    const { quoteId } = await request.json();

    if (!quoteId) {
      return NextResponse.json({ error: 'quoteId required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch quote with company and customer
    const { data: quote, error: qError } = await supabase
      .from('quotes')
      .select('id, quote_number, total, status, viewed_at, company_id, customer:customers(name, phone)')
      .eq('id', quoteId)
      .single();

    if (qError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Only alert on first view (status was 'sent', not yet 'viewed')
    if (quote.status !== 'sent') {
      return NextResponse.json({ message: 'Already viewed, no alert needed' });
    }

    // Check company settings
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, phone, quote_reminder_settings')
      .eq('id', quote.company_id)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const settings = (company.quote_reminder_settings as Record<string, unknown>) || {};

    // View alerts disabled
    if (settings.view_alerts === false) {
      return NextResponse.json({ message: 'View alerts disabled' });
    }

    // Get owner phone for SMS
    const { data: owner } = await supabase
      .from('users')
      .select('full_name, phone')
      .eq('company_id', company.id)
      .eq('role', 'owner')
      .single();

    const smsPhone = (settings.sms_phone as string) || owner?.phone || company.phone;
    const customer = quote.customer as unknown as { name: string; phone: string | null } | null;
    const customerName = customer?.name || 'A customer';
    const customerPhone = customer?.phone ? ` Their number: ${customer.phone}` : '';

    if (!smsPhone) {
      return NextResponse.json({ message: 'No phone number configured for alerts' });
    }

    // Send real-time alert
    await sendSMS({
      to: smsPhone,
      body: `${customerName} just opened your $${quote.total.toLocaleString()} quote (#${quote.quote_number || quote.id.slice(0, 8)}). Now's a great time to call!${customerPhone}`,
    });

    return NextResponse.json({ success: true, message: 'View alert sent' });
  } catch (err) {
    console.error('Quote view alert error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
