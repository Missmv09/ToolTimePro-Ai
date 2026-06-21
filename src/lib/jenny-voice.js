// TwiML helpers for the Jenny Pro voice receptionist.
//
// Voice is stateless per HTTP request, so we thread state through the same
// jenny_sms_conversations table (source = 'voice'), rebuilding history from
// the logged turns — the SMS and voice agents share one brain.

const { createClient } = require('@supabase/supabase-js');

let supabaseInstance = null;
function getServiceSupabase() {
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

async function resolveCompany(supabase, toNumber) {
  // Explicit pin wins (set JENNY_COMPANY_ID when test/demo companies exist).
  const pinned = process.env.JENNY_COMPANY_ID;
  if (pinned) {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', pinned)
      .maybeSingle();
    if (data) return data;
  }
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!twilioNumber || toNumber === twilioNumber || !toNumber) {
    const { data } = await supabase.from('companies').select('id, name').limit(1);
    if (data?.length) return data[0];
  }
  return null;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Amazon Polly voices available on Twilio for natural EN/ES speech.
function sayVoice(lang) {
  return lang === 'es'
    ? { voice: 'Polly.Lupe', language: 'es-MX' }
    : { voice: 'Polly.Joanna', language: 'en-US' };
}

function buildSay(text, lang) {
  const v = sayVoice(lang);
  return `<Say voice="${v.voice}" language="${v.language}">${escapeXml(text)}</Say>`;
}

// A speech <Gather> that posts the transcript to the given action URL.
function buildGather(promptText, lang, actionUrl) {
  const sttLang = lang === 'es' ? 'es-MX' : 'en-US';
  return (
    `<Gather input="speech" action="${actionUrl}" method="POST" ` +
    `speechTimeout="auto" language="${sttLang}">` +
    buildSay(promptText, lang) +
    `</Gather>`
  );
}

function voiceResponse(inner) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
    { status: 200, headers: { 'Content-Type': 'text/xml' } }
  );
}

// Find or create the voice conversation thread for this caller.
async function getOrCreateVoiceConversation(supabase, companyId, callerPhone) {
  const { data: existing } = await supabase
    .from('jenny_sms_conversations')
    .select('id, message_count, language')
    .eq('company_id', companyId)
    .eq('customer_phone', callerPhone)
    .eq('source', 'voice')
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from('jenny_sms_conversations')
    .insert({
      company_id: companyId,
      customer_name: 'Caller',
      customer_phone: callerPhone,
      status: 'needs_response',
      message_count: 0,
      source: 'voice',
      language: 'en',
    })
    .select('id, message_count, language')
    .single();

  return created;
}

module.exports = {
  getServiceSupabase,
  resolveCompany,
  buildSay,
  buildGather,
  voiceResponse,
  getOrCreateVoiceConversation,
  escapeXml,
};
