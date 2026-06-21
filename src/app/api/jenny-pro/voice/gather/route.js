import {
  getServiceSupabase,
  resolveCompany,
  buildSay,
  buildGather,
  voiceResponse,
  getOrCreateVoiceConversation,
} from '@/lib/jenny-voice';
import { runJennyAgent } from '@/lib/jenny-sms-agent';
import { createBooking } from '@/lib/booking-core';
import { notifyOperatorInApp } from '@/lib/jenny-notify';

export const dynamic = 'force-dynamic';

const GATHER_URL = '/api/jenny-pro/voice/gather';

/**
 * Conversational voice receptionist (speech).
 *
 * Twilio posts the caller's transcribed speech (SpeechResult). Jenny runs the
 * shared booking agent and speaks her reply, gathering again until she has
 * enough to book — then she creates the appointment and confirms by voice.
 */
export async function POST(request) {
  try {
    const form = await request.formData();
    const to = form.get('To');
    const caller = form.get('From');
    const speech = (form.get('SpeechResult') || '').toString().trim();

    const supabase = getServiceSupabase();
    const company = await resolveCompany(supabase, to);
    if (!company) {
      return voiceResponse(buildSay("Sorry, we can't help right now. Goodbye.", 'en'));
    }

    const { data: settings } = await supabase
      .from('jenny_pro_settings')
      .select('*')
      .eq('company_id', company.id)
      .maybeSingle();

    const conv = await getOrCreateVoiceConversation(supabase, company.id, caller);

    // No speech captured — (re)prompt.
    if (!speech) {
      const lang = settings?.language === 'es' ? 'es' : 'en';
      const prompt =
        lang === 'es'
          ? '¿En qué servicio le puedo ayudar y para qué día le gustaría agendar?'
          : 'What service can I help you with, and what day works for you?';
      return voiceResponse(buildGather(prompt, lang, GATHER_URL));
    }

    // Log the caller's turn.
    if (conv?.id) {
      await supabase.from('jenny_sms_messages').insert({
        conversation_id: conv.id,
        direction: 'inbound',
        body: speech,
        status: 'received',
      });
    }

    // Rebuild history for context.
    let history = [];
    if (conv?.id) {
      const { data: msgs } = await supabase
        .from('jenny_sms_messages')
        .select('direction, body, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })
        .limit(20);
      const prior = (msgs || []).slice(0, -1).slice(-10);
      history = prior.map((m) => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.body,
      }));
    }

    const result = await runJennyAgent({
      supabase,
      companyId: company.id,
      settings,
      history,
      message: speech,
      channel: 'voice',
    });

    const lang = result.language;

    // Log Jenny's spoken reply.
    if (conv?.id) {
      await supabase.from('jenny_sms_messages').insert({
        conversation_id: conv.id,
        direction: 'outbound',
        body: result.reply,
        status: 'sent',
      });
      await supabase
        .from('jenny_sms_conversations')
        .update({
          language: lang,
          last_intent: result.intent,
          last_message: result.reply,
          last_message_at: new Date().toISOString(),
          message_count: (conv.message_count || 0) + 1,
        })
        .eq('id', conv.id);
    }

    // Emergency — escalate by voice and end.
    if (result.emergency) {
      return voiceResponse(buildSay(result.reply, lang) + '<Hangup/>');
    }

    // Ready to book?
    const autoBookingOn = !settings || settings.auto_booking !== false;
    if (result.readyToBook && result.booking && autoBookingOn) {
      const b = result.booking;
      const bookingRes = await createBooking(supabase, {
        companyId: company.id,
        serviceName: b.serviceName,
        scheduledDate: b.scheduledDate,
        scheduledTimeStart: b.scheduledTimeStart,
        durationMinutes: 60,
        customerName: b.customerName,
        customerPhone: caller,
        customerAddress: b.address || undefined,
        notes: `${b.notes || ''} (booked via Jenny AI voice)`.trim(),
        smsConsent: false,
        source: 'jenny_voice',
        autoAdvance: true,
      });

      if (bookingRes.ok) {
        if (conv?.id) {
          await supabase
            .from('jenny_sms_conversations')
            .update({ status: 'resolved', booking_id: bookingRes.booking.id, customer_name: b.customerName })
            .eq('id', conv.id);
        }
        await supabase
          .from('jenny_voice_calls')
          .update({ booking_created: true })
          .eq('company_id', company.id)
          .eq('caller_phone', caller)
          .eq('booking_created', false);

        const opLang = settings?.operator_language || 'en';
        await notifyOperatorInApp(supabase, {
          companyId: company.id,
          type: 'booking_received',
          title: opLang === 'es' ? 'Nueva cita (llamada)' : 'New booking (call)',
          message:
            opLang === 'es'
              ? `Jenny agendó a ${b.customerName} para ${b.serviceName}.`
              : `Jenny booked ${b.customerName} for ${b.serviceName}.`,
          link: '/dashboard/dispatch',
        });

        const closing = lang === 'es' ? ' ¡Gracias por llamar!' : ' Thanks for calling!';
        return voiceResponse(buildSay(result.reply + closing, lang) + '<Hangup/>');
      }
      console.error('[voice/gather] booking failed:', bookingRes.error);
    }

    // Keep the conversation going.
    return voiceResponse(buildGather(result.reply, lang, GATHER_URL));
  } catch (error) {
    console.error('[Jenny Voice gather] Error:', error);
    return voiceResponse(buildSay('Sorry, something went wrong. Please call again later.', 'en'));
  }
}
