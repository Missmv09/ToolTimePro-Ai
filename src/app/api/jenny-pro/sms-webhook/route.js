import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let supabaseInstance = null;

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabaseInstance = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseInstance;
}

/**
 * Twilio SMS webhook handler for Jenny Pro.
 * When a customer texts the business Twilio number, this:
 * 1. Finds or creates a conversation record
 * 2. Logs the inbound message
 * 3. Updates conversation status to needs_response
 *
 * Configure as your Twilio phone number's webhook URL:
 * POST https://yourdomain.com/api/jenny-pro/sms-webhook
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const from = formData.get('From');
    const body = formData.get('Body');
    const messageSid = formData.get('MessageSid');
    const to = formData.get('To');

    if (!from || !body) {
      return new Response('<Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const supabase = getSupabase();

    // Find the company that owns this Twilio phone number
    // For now, look up by matching the TWILIO_PHONE_NUMBER env var
    // In multi-tenant setup, this would query a phone_numbers table
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    let companyId = null;

    if (twilioNumber && to === twilioNumber) {
      // Single-tenant: use the first company (or match by config)
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      if (companies?.length) companyId = companies[0].id;
    }

    if (!companyId) {
      // Return empty TwiML — we can't route the message
      return new Response('<Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Find or create conversation
    const { data: existing } = await supabase
      .from('jenny_sms_conversations')
      .select('id, message_count')
      .eq('company_id', companyId)
      .eq('customer_phone', from)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId;

    if (existing) {
      conversationId = existing.id;
      await supabase
        .from('jenny_sms_conversations')
        .update({
          last_message: body,
          last_message_at: new Date().toISOString(),
          status: 'needs_response',
          message_count: (existing.message_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Check if we know this customer
      const cleanPhone = from.replace(/\D/g, '').slice(-10);
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', companyId)
        .or(`phone.ilike.%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      const { data: newConv } = await supabase
        .from('jenny_sms_conversations')
        .insert({
          company_id: companyId,
          customer_name: customer?.name || 'Unknown',
          customer_phone: from,
          last_message: body,
          last_message_at: new Date().toISOString(),
          status: 'needs_response',
          message_count: 1,
          source: 'inbound',
        })
        .select('id')
        .single();

      conversationId = newConv?.id;
    }

    // Log the message
    if (conversationId) {
      await supabase.from('jenny_sms_messages').insert({
        conversation_id: conversationId,
        direction: 'inbound',
        body: body,
        twilio_sid: messageSid,
        status: 'received',
      });
    }

    // Return empty TwiML (no auto-reply for now — owner reviews and responds)
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('[Jenny Pro SMS Webhook] Error:', error);
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
