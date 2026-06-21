import { getServiceSupabase, resolveCompany, buildSay, voiceResponse } from '@/lib/jenny-voice';
import { sendSMS } from '@/lib/twilio';
import { t } from '@/lib/jenny-language';
import { notifyOperatorInApp } from '@/lib/jenny-notify';

export const dynamic = 'force-dynamic';

/**
 * Dial-action callback: fires after Jenny tried to ring the owner.
 *
 * If the owner answered (DialCallStatus = completed) we simply hang up.
 * Otherwise the call was MISSED — Jenny instantly texts the caller to open an
 * SMS booking conversation, logs the missed call, and notifies the operator.
 * This is the "turn a missed call into a booked job" path.
 */
export async function POST(request) {
  try {
    const form = await request.formData();
    const dialStatus = form.get('DialCallStatus');
    const caller = form.get('From'); // original caller
    const to = form.get('To');
    const callSid = form.get('CallSid');

    // Owner picked up — nothing more to do.
    if (dialStatus === 'completed') {
      return voiceResponse('<Hangup/>');
    }

    const supabase = getServiceSupabase();
    const company = await resolveCompany(supabase, to);
    if (!company) return voiceResponse('<Hangup/>');

    const { data: settings } = await supabase
      .from('jenny_pro_settings')
      .select('language, operator_language')
      .eq('company_id', company.id)
      .maybeSingle();

    const lang = settings?.language === 'es' ? 'es' : 'en';
    const companyName = company.name || 'our team';

    // Log the missed call.
    await supabase.from('jenny_voice_calls').insert({
      company_id: company.id,
      caller_phone: caller,
      call_type: 'inbound',
      status: 'missed',
      twilio_sid: callSid,
    });

    // Text the caller to keep the lead alive — this seeds the SMS booking flow.
    if (caller) {
      await sendSMS({ to: caller, body: t(lang).missedCallText(companyName) });

      // Seed an SMS conversation so the inbound reply threads correctly.
      const { data: existing } = await supabase
        .from('jenny_sms_conversations')
        .select('id')
        .eq('company_id', company.id)
        .eq('customer_phone', caller)
        .neq('status', 'resolved')
        .maybeSingle();
      if (!existing) {
        await supabase.from('jenny_sms_conversations').insert({
          company_id: company.id,
          customer_phone: caller,
          customer_name: 'Missed call',
          status: 'needs_response',
          source: 'inbound',
          last_message: '[missed call — auto text sent]',
          last_message_at: new Date().toISOString(),
          message_count: 0,
          language: lang,
        });
      }
    }

    const opLang = settings?.operator_language || 'en';
    await notifyOperatorInApp(supabase, {
      companyId: company.id,
      type: 'new_lead',
      title: opLang === 'es' ? 'Llamada perdida' : 'Missed call',
      message:
        opLang === 'es'
          ? `Llamada perdida de ${caller}. Jenny le envió un mensaje de texto.`
          : `Missed call from ${caller}. Jenny texted them to follow up.`,
      link: '/dashboard/jenny-pro',
    });

    return voiceResponse(buildSay(t(lang).voiceMissed(companyName), lang) + '<Hangup/>');
  } catch (error) {
    console.error('[Jenny Voice after-dial] Error:', error);
    return voiceResponse('<Hangup/>');
  }
}
