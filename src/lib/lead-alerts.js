// Speed-to-lead: what happens the second a website contact form is submitted.
//
// GoHighLevel's whole pitch to a contractor is "you will know about a lead in
// under a minute and the lead will hear back before they call the next guy".
// This gives Task Iguana the same behaviour natively:
//   1. In-app notification to everyone on the company
//   2. SMS heads-up to the owner's escalation number (jenny_pro_settings)
//   3. Optional: Jenny texts the lead back immediately and opens a thread, so
//      the lead can reply and get booked without the owner lifting a finger.
//
// Everything here is best-effort. A failed alert must never fail the form.

const { notifyOperatorInApp, notifyOperatorSMS } = require('./jenny-notify');
const { sendSMS } = require('./twilio');
const { detectLanguage, resolveReplyLanguage } = require('./jenny-language');

function clip(str, n) {
  const s = String(str || '').trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Text the owner receives. Kept short: it lands on a phone mid-job. */
function buildLeadAlertText({ lead, lang = 'en' }) {
  const name = lead.name || (lang === 'es' ? 'Alguien' : 'Someone');
  const service = lead.service_requested ? ` — ${clip(lead.service_requested, 40)}` : '';
  const phone = lead.phone ? ` ${lead.phone}` : '';
  const note = lead.message ? ` "${clip(lead.message, 80)}"` : '';
  return lang === 'es'
    ? `🔥 Nuevo lead del sitio web: ${name}${service}.${phone}${note} Responde rápido: taskiguana.com/dashboard/leads`
    : `🔥 New website lead: ${name}${service}.${phone}${note} Reply fast: taskiguana.com/dashboard/leads`;
}

/** Text the lead receives if auto-reply is on. Opens a Jenny thread. */
function buildLeadAutoReply({ companyName, lead, lang = 'en' }) {
  const first = String(lead.name || '').trim().split(/\s+/)[0];
  const greet = first ? (lang === 'es' ? `¡Hola ${first}!` : `Hi ${first}!`) : (lang === 'es' ? '¡Hola!' : 'Hi!');
  const service = lead.service_requested ? clip(lead.service_requested, 40) : null;
  if (lang === 'es') {
    return `${greet} Habla ${companyName}. Recibimos tu solicitud${service ? ` de ${service}` : ''}. ¿Qué día y hora te funciona mejor? Responde aquí y te agendo. (Responde STOP para darte de baja.)`;
  }
  return `${greet} This is ${companyName}. We got your request${service ? ` for ${service}` : ''}. What day and time works best for you? Reply here and I can get you on the schedule. (Reply STOP to opt out.)`;
}

/**
 * Fire the new-lead alerts for a company.
 *
 * @param {object} supabase  service-role client
 * @param {object} params
 * @param {string} params.companyId
 * @param {{ id?: string, name?: string, phone?: string|null, email?: string|null, service_requested?: string|null, message?: string|null, source?: string }} params.lead
 * @returns {Promise<{ alerted: boolean, smsAlerted: boolean, autoReplied: boolean }>}
 */
async function notifyNewLead(supabase, { companyId, lead }) {
  const out = { alerted: false, smsAlerted: false, autoReplied: false };
  if (!companyId || !lead) return out;

  let settings = null;
  let company = null;
  try {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase
        .from('jenny_pro_settings')
        .select('lead_alerts_enabled, lead_auto_reply_enabled, escalation_phone, language, operator_language')
        .eq('company_id', companyId)
        .maybeSingle(),
      supabase.from('companies').select('id, name').eq('id', companyId).maybeSingle(),
    ]);
    settings = s || null;
    company = c || null;
  } catch (err) {
    console.error('[lead-alerts] settings lookup failed:', err.message);
  }

  const alertsOn = !settings || settings.lead_alerts_enabled !== false;
  const opLang = settings?.operator_language === 'es' ? 'es' : 'en';
  const companyName = company?.name || 'our team';

  // 1 + 2. Owner alerts.
  if (alertsOn) {
    const summary = buildLeadAlertText({ lead, lang: opLang });
    await Promise.all([
      notifyOperatorInApp(supabase, {
        companyId,
        type: 'new_lead',
        title: opLang === 'es' ? 'Nuevo lead del sitio web' : 'New website lead',
        message: `${lead.name || 'Someone'}${lead.service_requested ? ` — ${clip(lead.service_requested, 60)}` : ''}${lead.phone ? ` (${lead.phone})` : ''}`,
        link: '/dashboard/leads',
      }),
      (async () => {
        if (!settings?.escalation_phone) return;
        await notifyOperatorSMS(settings.escalation_phone, summary);
        out.smsAlerted = true;
      })(),
    ]);
    out.alerted = true;
  }

  // 3. Instant reply to the lead (opt-in per company; requires a phone).
  if (settings?.lead_auto_reply_enabled === true && lead.phone) {
    try {
      const lang = resolveReplyLanguage(detectLanguage(lead.message || ''), settings.language);
      const text = buildLeadAutoReply({ companyName, lead, lang });
      const result = await sendSMS({ to: lead.phone, body: text });
      if (result.success) {
        out.autoReplied = true;
        const now = new Date().toISOString();
        const { data: conv, error: convErr } = await supabase
          .from('jenny_sms_conversations')
          .insert({
            company_id: companyId,
            customer_name: lead.name || 'Unknown',
            customer_phone: lead.phone,
            last_message: text,
            last_message_at: now,
            status: 'active',
            message_count: 1,
            lead_id: lead.id || null,
            source: 'web_lead',
            language: lang,
          })
          .select('id')
          .single();
        if (convErr) {
          console.error('[lead-alerts] conversation insert failed:', convErr.message);
        } else if (conv?.id) {
          const { error: msgErr } = await supabase.from('jenny_sms_messages').insert({
            conversation_id: conv.id,
            direction: 'outbound',
            body: text,
            twilio_sid: result.messageId || null,
            status: 'sent',
            sender: 'jenny',
          });
          if (msgErr) console.error('[lead-alerts] message insert failed:', msgErr.message);
        }
      }
    } catch (err) {
      console.error('[lead-alerts] auto-reply failed:', err.message);
    }
  }

  return out;
}

module.exports = { notifyNewLead, buildLeadAlertText, buildLeadAutoReply };
