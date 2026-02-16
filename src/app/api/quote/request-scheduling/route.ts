import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      quoteId,
      quoteNumber,
      customerName,
      customerPhone,
      customerEmail,
      companyId,
      total,
      preferredContact,
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Find owner/admin users for the company to notify
    const { data: owners } = await supabase
      .from('users')
      .select('phone, full_name, email')
      .eq('company_id', companyId)
      .in('role', ['owner', 'admin']);

    const contactTimeLabels: Record<string, string> = {
      morning: 'Morning (8am-12pm)',
      afternoon: 'Afternoon (12pm-5pm)',
      evening: 'Evening (5pm-7pm)',
      anytime: 'Anytime',
    };
    const contactLabel = contactTimeLabels[preferredContact] || 'Anytime';

    // Notify each owner/admin via SMS and email
    if (owners && owners.length > 0) {
      for (const owner of owners) {
        // Send SMS notification
        if (owner.phone) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/sms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: owner.phone,
                template: 'custom',
                data: {
                  message: `Quote ${quoteNumber} APPROVED by ${customerName} ($${total?.toLocaleString() || '0'})! Customer wants to schedule - preferred callback: ${contactLabel}. ${customerPhone ? `Call: ${customerPhone}` : ''}`,
                },
                companyId,
              }),
            });
          } catch {
            console.log('SMS notification skipped for scheduling request');
          }
        }

        // Send email notification
        if (owner.email) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/quote/notify-scheduling`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: owner.email,
                ownerName: owner.full_name || 'Boss',
                quoteNumber,
                customerName,
                customerPhone,
                customerEmail,
                total,
                preferredContact: contactLabel,
                dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/quotes?status=approved`,
              }),
            });
          } catch {
            console.log('Email notification skipped for scheduling request');
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scheduling request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send scheduling request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
