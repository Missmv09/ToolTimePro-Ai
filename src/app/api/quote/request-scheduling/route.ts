import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    if (!quoteId || !companyId) {
      return NextResponse.json({ error: 'Quote ID and Company ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the quote exists and belongs to the company
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, status, company_id')
      .eq('id', quoteId)
      .eq('company_id', companyId)
      .single();

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Persist the scheduling request on the quote so the dashboard can display it
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        scheduling_requested_at: new Date().toISOString(),
        preferred_contact_time: preferredContact || 'anytime',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (updateError) {
      // Columns may not exist yet — fall back to appending to notes
      console.log('Could not save scheduling columns, appending to notes:', updateError.message);
      const contactTimeLabelsForNote: Record<string, string> = {
        morning: 'Morning (8am-12pm)',
        afternoon: 'Afternoon (12pm-5pm)',
        evening: 'Evening (5pm-7pm)',
        anytime: 'Anytime',
      };
      const label = contactTimeLabelsForNote[preferredContact] || 'Anytime';
      const schedulingNote = `\n\n[Scheduling Request] Customer requested callback: ${label} (${new Date().toLocaleString()})`;
      const { data: currentQuote } = await supabase
        .from('quotes')
        .select('notes')
        .eq('id', quoteId)
        .single();
      await supabase
        .from('quotes')
        .update({
          notes: (currentQuote?.notes || '') + schedulingNote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);
    }

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    if (owners && owners.length > 0) {
      for (const owner of owners) {
        // Send SMS notification
        if (owner.phone) {
          try {
            await fetch(`${appUrl}/api/sms`, {
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
            await fetch(`${appUrl}/api/quote/notify-scheduling`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quoteId,
                to: owner.email,
                ownerName: owner.full_name || 'Boss',
                quoteNumber,
                customerName,
                customerPhone,
                customerEmail,
                total,
                preferredContact: contactLabel,
                dashboardLink: `${appUrl}/dashboard/quotes?status=approved`,
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
