import { createClient } from '@supabase/supabase-js';
import { runJennyAgent } from '@/lib/jenny-sms-agent';
import { createBooking } from '@/lib/booking-core';
import { classifyKeyword, detectLanguage, resolveReplyLanguage, t } from '@/lib/jenny-language';
import { notifyOperatorInApp, notifyOperatorSMS } from '@/lib/jenny-notify';

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

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twiml(message) {
  const body = message
    ? `<Response><Message>${escapeXml(message)}</Message></Response>`
    : '<Response></Response>';
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/xml' } });
}

// Format a YYYY-MM-DD + HH:MM for a friendly confirmation line.
function fmtDate(dateStr) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
}
function fmtTime(timeStr) {
  const [h, m] = String(timeStr).split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m || '00'} ${ampm}`;
}

/**
 * Twilio SMS webhook for Jenny Pro.
 *
 * Turns an inbound text into a booked job:
 *  1. Logs the message and maintains a conversation thread
 *  2. Honors STOP / START / HELP opt-out keywords (A2P 10DLC compliance)
 *  3. Escalates emergencies to the operator instead of booking
 *  4. Runs the AI booking agent (bilingual, auto-detects EN/ES) and replies
 *  5. Auto-books when she has all the details (if auto_booking is on) and
 *     notifies the operator
 *
 * Configure as the Twilio number's incoming-message webhook:
 *   POST https://yourdomain.com/api/jenny-pro/sms-webhook
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const from = formData.get('From');
    const body = (formData.get('Body') || '').toString().trim();
    const messageSid = formData.get('MessageSid');
    const to = formData.get('To');

    if (!from || !body) return twiml(null);

    const supabase = getSupabase();

    // Resolve the company that owns this Twilio number.
    // Prefer an explicit JENNY_COMPANY_ID (set this when you have more than one
    // company in the DB — e.g. test/demo records — so Jenny always serves the
    // right business). Otherwise fall back to single-tenant matching.
    let companyId = process.env.JENNY_COMPANY_ID || null;
    if (!companyId) {
      const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
      if (!twilioNumber || to === twilioNumber || !to) {
        const { data: companies } = await supabase.from('companies').select('id').limit(1);
        if (companies?.length) companyId = companies[0].id;
      }
    }
    if (!companyId) return twiml(null);

    // Load per-company Jenny Pro config.
    const { data: settings } = await supabase
      .from('jenny_pro_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    // Find or create the active conversation for this customer.
    const { data: existing } = await supabase
      .from('jenny_sms_conversations')
      .select('id, message_count, language')
      .eq('company_id', companyId)
      .eq('customer_phone', from)
      .neq('status', 'resolved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId = existing?.id || null;
    let knownCustomer = null;

    if (existing) {
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
      const cleanPhone = from.replace(/\D/g, '').slice(-10);
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', companyId)
        .or(`phone.ilike.%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();
      knownCustomer = customer || null;

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
          language: detectLanguage(body),
        })
        .select('id')
        .single();
      conversationId = newConv?.id || null;
    }

    // Log the inbound message.
    if (conversationId) {
      await supabase.from('jenny_sms_messages').insert({
        conversation_id: conversationId,
        direction: 'inbound',
        body,
        twilio_sid: messageSid,
        status: 'received',
      });
    }

    const logOutbound = async (text) => {
      if (conversationId && text) {
        await supabase.from('jenny_sms_messages').insert({
          conversation_id: conversationId,
          direction: 'outbound',
          body: text,
          status: 'sent',
        });
        await supabase
          .from('jenny_sms_conversations')
          .update({ last_message: text, last_message_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    };

    // ── Opt-out / opt-in / help keywords (compliance) ──────────────────────
    const keyword = classifyKeyword(body);
    const kwLang = resolveReplyLanguage(detectLanguage(body), settings?.language);
    if (keyword === 'stop') {
      // Mark the customer opted out; Twilio also blocks further sends.
      const cleanPhone = from.replace(/\D/g, '').slice(-10);
      await supabase
        .from('customers')
        .update({ sms_consent: false })
        .eq('company_id', companyId)
        .ilike('phone', `%${cleanPhone}%`);
      // Twilio auto-responds to STOP; return empty to avoid a double reply.
      return twiml(null);
    }
    if (keyword === 'start') {
      await logOutbound(t(kwLang).optInConfirm);
      return twiml(t(kwLang).optInConfirm);
    }
    if (keyword === 'help') {
      await logOutbound(t(kwLang).help);
      return twiml(t(kwLang).help);
    }

    // ── Run the booking agent ──────────────────────────────────────────────
    // Build recent history for context (last ~10 messages).
    let history = [];
    if (conversationId) {
      const { data: msgs } = await supabase
        .from('jenny_sms_messages')
        .select('direction, body, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);
      // Exclude the just-logged inbound (it's passed as `message`).
      const prior = (msgs || []).slice(0, -1).slice(-10);
      history = prior.map((m) => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.body,
      }));
    }

    const result = await runJennyAgent({
      supabase,
      companyId,
      settings,
      history,
      message: body,
      channel: 'sms',
    });

    // Persist language/intent on the conversation.
    if (conversationId) {
      await supabase
        .from('jenny_sms_conversations')
        .update({ language: result.language, last_intent: result.intent })
        .eq('id', conversationId);
    }

    // ── Emergency: escalate, don't book ────────────────────────────────────
    if (result.emergency) {
      await logOutbound(result.reply);
      const opLang = settings?.operator_language || 'en';
      await Promise.all([
        notifyOperatorSMS(
          settings?.escalation_phone,
          `🚨 URGENT: ${knownCustomer?.name || from} texted: "${body.slice(0, 120)}"`
        ),
        notifyOperatorInApp(supabase, {
          companyId,
          type: 'new_lead',
          title: opLang === 'es' ? 'Mensaje urgente' : 'Urgent message',
          message: `${knownCustomer?.name || from}: ${body.slice(0, 140)}`,
          link: '/dashboard/jenny-pro',
        }),
      ]);
      return twiml(result.reply);
    }

    // ── Auto-book when ready (and enabled) ─────────────────────────────────
    const autoBookingOn = !settings || settings.auto_booking !== false;
    if (result.readyToBook && result.booking && autoBookingOn) {
      const b = result.booking;
      const bookingRes = await createBooking(supabase, {
        companyId,
        serviceName: b.serviceName,
        scheduledDate: b.scheduledDate,
        scheduledTimeStart: b.scheduledTimeStart,
        durationMinutes: 60,
        customerName: b.customerName,
        customerPhone: from,
        customerAddress: b.address || undefined,
        notes: `${b.notes || ''} (booked via Jenny AI SMS)`.trim(),
        smsConsent: true, // they texted us first — they initiated the conversation
        source: 'jenny_sms',
        autoAdvance: true,
      });

      if (bookingRes.ok) {
        // Jenny's reply already confirms; mark the thread resolved + linked.
        if (conversationId) {
          await supabase
            .from('jenny_sms_conversations')
            .update({
              status: 'resolved',
              booking_id: bookingRes.booking.id,
              customer_name: b.customerName,
            })
            .eq('id', conversationId);
        }
        const opLang = settings?.operator_language || 'en';
        const when = `${fmtDate(bookingRes.booking.date)} ${fmtTime(bookingRes.booking.time)}`;
        await Promise.all([
          notifyOperatorSMS(
            settings?.escalation_phone,
            `✅ Jenny booked ${b.customerName} — ${b.serviceName}, ${when}.`
          ),
          notifyOperatorInApp(supabase, {
            companyId,
            type: 'booking_received',
            title: opLang === 'es' ? 'Nueva cita agendada' : 'New booking',
            message:
              opLang === 'es'
                ? `Jenny agendó a ${b.customerName} para ${b.serviceName} el ${when}.`
                : `Jenny booked ${b.customerName} for ${b.serviceName} on ${when}.`,
            link: '/dashboard/dispatch',
          }),
        ]);
        await logOutbound(result.reply);
        return twiml(result.reply);
      }
      // Booking failed (e.g. fully booked) — let Jenny's reply stand and flag it.
      console.error('[sms-webhook] booking failed:', bookingRes.error);
    }

    // ── Normal conversational reply ────────────────────────────────────────
    await logOutbound(result.reply);
    return twiml(result.reply);
  } catch (error) {
    console.error('[Jenny Pro SMS Webhook] Error:', error);
    return twiml(null);
  }
}
