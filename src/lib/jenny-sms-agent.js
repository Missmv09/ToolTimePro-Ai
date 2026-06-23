// Jenny Pro conversational booking agent.
//
// Channel-agnostic: given a conversation history + the latest inbound message,
// Jenny replies in the customer's language and, when she has everything she
// needs, returns a structured booking she can hand to booking-core.
//
// Used by the SMS webhook and the voice (speech) receptionist.

const { aiComplete, parseAIJson } = require('./ai-client');
const { detectLanguage, resolveReplyLanguage, t } = require('./jenny-language');

// Today's date in the company's local context (server is UTC; good enough for
// "tomorrow / next Tuesday" style relative scheduling at day granularity).
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function matchesEmergency(text, keywords) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const list = Array.isArray(keywords) && keywords.length
    ? keywords
    : ['emergency', 'urgent', 'burst', 'leak', 'flood', 'fire', 'broken', 'emergencia', 'urgente', 'fuga', 'inundación', 'incendio'];
  return list.some((k) => lower.includes(String(k).toLowerCase()));
}

function buildSystemPrompt({ companyName, businessType, services, lang, today, channel, businessInfo, existingBookings }) {
  const existingLines = existingBookings && existingBookings.length
    ? existingBookings
        .map((b) => `- ${b.title || 'Appointment'} on ${b.scheduled_date} at ${b.scheduled_time_start}`)
        .join('\n')
    : '';
  const serviceLines = services && services.length
    ? services
        .map((s) => {
          const price = s.default_price != null ? ` (~$${s.default_price})` : '';
          const dur = s.duration_minutes ? `, ${s.duration_minutes} min` : '';
          return `- ${s.name}${price}${dur}`;
        })
        .join('\n')
    : '- General service visit';

  const langInstruction =
    lang === 'es'
      ? 'Respond ONLY in natural, friendly Mexican/California Spanish.'
      : 'Respond ONLY in natural, friendly English.';

  const channelNote =
    channel === 'voice'
      ? 'This is a phone call transcribed to text. Keep replies to ONE short spoken sentence. Ask only one question at a time.'
      : 'This is an SMS conversation. Keep replies under 320 characters. Ask only one question at a time.';

  return `You are Jenny, the booking assistant for ${companyName || 'a local service business'} (${businessType || 'home services'}). You turn an inbound message into a booked appointment.

${langInstruction}
${channelNote}

PERSONALITY & STYLE:
- Sound like a warm, sharp human receptionist — never robotic or generic. No "I'm an AI" disclaimers.
- Greet by name once you know it, and acknowledge what they actually said before asking the next thing.
- Be concise and confident. One clear question at a time, always nudging toward a booked appointment.
- Sound local and helpful, not salesy. A single emoji is fine occasionally; don't overdo it.

HANDLING COMMON SITUATIONS:
- Price questions: give the range from the services list if available; if unknown, say it depends and offer a free estimate visit instead of guessing a number.
- Hesitation or "just checking": offer the easiest next step (a quick estimate or a tentative time) to keep momentum.
- Vague timing ("sometime this week", "ASAP"): propose a specific concrete slot (e.g., "How about tomorrow at 9 AM?").
- Out-of-scope or off-topic: answer briefly, then steer back to booking.
- Never promise anything not in the services/business info below.

Today's date is ${today}. Convert relative dates ("tomorrow", "next Tuesday", "this Friday") into real calendar dates.

Services offered:
${serviceLines}
${businessInfo ? `\nAbout this business (use this to answer accurately — pricing, service area, hours, specials, tone):\n${businessInfo}\n` : ''}${existingLines ? `\nIMPORTANT — this customer ALREADY has these upcoming appointments:\n${existingLines}\nDo NOT create a duplicate. If they want to MOVE one to a different day/time, set "is_reschedule": true and put the NEW date/time in "booking". If they're just confirming or chatting, set ready_to_book false and don't book again. Only book a brand-new appointment if it's clearly a different/additional job.\n` : ''}
Your goal is to collect, conversationally and warmly:
1. The customer's name
2. The service they need (match to a service above when possible)
3. The date and time they want
You may also capture a street address if they offer it, but it is optional.

Booking hours are 8:00 AM to 5:00 PM, Monday–Saturday. If they ask for a time outside that, offer the nearest valid slot.

You MUST reply with a single JSON object and NOTHING else, in this exact shape:
{
  "reply": "the message to send back to the customer, in their language",
  "language": "en" or "es",
  "intent": "booking" | "question" | "emergency" | "other",
  "ready_to_book": true or false,
  "is_reschedule": true or false (true ONLY when moving an existing appointment to a new day/time),
  "booking": {
    "customerName": "string",
    "serviceName": "string",
    "scheduledDate": "YYYY-MM-DD",
    "scheduledTimeStart": "HH:MM" (24-hour),
    "address": "string or empty",
    "notes": "short summary of the request"
  } or null
}

Set "ready_to_book" to true ONLY when you have name, service, a concrete date, and a concrete time. When ready_to_book is true, your "reply" must clearly confirm the appointment details (service, day, and time) so the customer sees it. Otherwise ask for the single most important missing piece. Never invent details the customer did not give.`;
}

/**
 * Run one turn of the Jenny booking agent.
 *
 * @param {object} opts
 * @param {object} opts.supabase    - service-role client (for services/company lookup)
 * @param {string} opts.companyId
 * @param {object} [opts.company]   - { name, business_type } (fetched if omitted)
 * @param {object} [opts.settings]  - jenny_pro_settings row
 * @param {Array}  opts.history     - [{ role:'user'|'assistant', content }]
 * @param {string} opts.message     - latest inbound text
 * @param {'sms'|'voice'} [opts.channel='sms']
 * @returns {Promise<{ reply, language, intent, readyToBook, booking, emergency }>}
 */
async function runJennyAgent({ supabase, companyId, company, settings, history = [], message, channel = 'sms', existingBookings = [] }) {
  const detected = detectLanguage(message);
  const lang = resolveReplyLanguage(detected, settings?.language);

  // Emergency short-circuit — never run the booking flow on an emergency.
  if (matchesEmergency(message, settings?.emergency_keywords)) {
    return {
      reply: t(lang).emergencyReply,
      language: lang,
      intent: 'emergency',
      readyToBook: false,
      booking: null,
      emergency: true,
    };
  }

  // Load company + services context (only if not provided).
  let companyName = company?.name;
  let businessType = company?.business_type;
  if (!companyName) {
    const { data } = await supabase
      .from('companies')
      .select('name, business_type')
      .eq('id', companyId)
      .single();
    companyName = data?.name;
    businessType = data?.business_type;
  }

  const { data: services } = await supabase
    .from('services')
    .select('name, default_price, duration_minutes')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .limit(25);

  const systemPrompt = buildSystemPrompt({
    companyName,
    businessType,
    services: services || [],
    lang,
    today: todayISO(),
    channel,
    businessInfo: settings?.business_info || '',
    existingBookings,
  });

  let ai;
  try {
    ai = await aiComplete({
      systemPrompt,
      messages: [...history, { role: 'user', content: message }],
      maxTokens: 400,
      temperature: 0.5,
      // 'high' = Claude Sonnet — far more natural/persuasive replies than the
      // fast model. Worth it for a revenue-driving booking conversation.
      tier: 'high',
    });
  } catch (err) {
    // Both providers unavailable — always give the customer a reply.
    console.error('[jenny-agent] AI providers unavailable:', err.message);
    return {
      reply: t(lang).fallback,
      language: lang,
      intent: 'other',
      readyToBook: false,
      booking: null,
      emergency: false,
    };
  }

  let result;
  try {
    result = parseAIJson(ai.content);
  } catch (err) {
    // Model replied with prose instead of JSON — still talk to the customer
    // (just don't auto-book on this turn).
    console.error('[jenny-agent] non-JSON reply, using raw text:', err.message);
    const raw = typeof ai.content === 'string' ? ai.content.trim() : '';
    return {
      reply: raw || t(lang).fallback,
      language: lang,
      intent: 'other',
      readyToBook: false,
      booking: null,
      emergency: false,
    };
  }

  const booking = result.booking || null;
  const hasRequired =
    booking &&
    booking.customerName &&
    booking.serviceName &&
    booking.scheduledDate &&
    booking.scheduledTimeStart;

  return {
    reply: typeof result.reply === 'string' && result.reply.trim() ? result.reply.trim() : t(lang).fallback,
    language: result.language === 'es' || result.language === 'en' ? result.language : lang,
    intent: result.intent || 'other',
    readyToBook: !!(result.ready_to_book && hasRequired),
    isReschedule: !!(result.is_reschedule && hasRequired),
    booking: hasRequired ? booking : null,
    emergency: false,
  };
}

module.exports = { runJennyAgent, matchesEmergency, buildSystemPrompt };
