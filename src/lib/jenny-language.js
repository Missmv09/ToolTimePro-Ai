// Bilingual helpers for the Jenny Pro booking agent (SMS + voice).
//
// Jenny is Spanish-aware: she detects the language of an inbound message and
// replies in kind. The operator (contractor) has their own preferred language
// for notifications, independent of how the customer is talking to Jenny.

// Common Spanish tokens / accented characters used for lightweight detection.
// We don't need perfect language ID — the AI also reports the language it used.
const SPANISH_HINTS = [
  ' hola', 'buenos dias', 'buenos días', 'buenas', 'gracias', 'por favor',
  'necesito', 'quiero', 'cuanto', 'cuánto', 'cuesta', 'precio', 'cita',
  'mañana', 'manana', 'hoy', 'jardin', 'jardín', 'plomero', 'plomería',
  'fuga', 'agua', 'cesped', 'césped', 'arreglar', 'servicio', 'disponible',
  'ayuda', 'señor', 'senor', 'está', 'esta', 'puedo', 'tengo', 'sí',
];

const ACCENTED = /[áéíóúñ¿¡]/i;

/**
 * Detect whether an inbound message is Spanish or English.
 * @param {string} text
 * @returns {'es' | 'en'}
 */
function detectLanguage(text) {
  if (!text) return 'en';
  const lower = ` ${text.toLowerCase()} `;
  if (ACCENTED.test(text)) return 'es';
  const hits = SPANISH_HINTS.filter((h) => lower.includes(h)).length;
  return hits >= 1 ? 'es' : 'en';
}

/**
 * Resolve the language Jenny should reply in, honoring the company setting.
 * - setting 'en'  → always English
 * - setting 'es'  → always Spanish
 * - setting 'both'/undefined → mirror the customer (auto-detect)
 *
 * @param {string} detected - 'en' | 'es'
 * @param {string} [setting] - jenny_pro_settings.language
 * @returns {'es' | 'en'}
 */
function resolveReplyLanguage(detected, setting) {
  if (setting === 'en' || setting === 'es') return setting;
  return detected === 'es' ? 'es' : 'en';
}

const STRINGS = {
  en: {
    optOutConfirm: 'You have been unsubscribed and will no longer receive messages. Reply START to opt back in.',
    optInConfirm: "You're subscribed again. How can we help you today?",
    help: 'This is an automated assistant. Reply STOP to unsubscribe. For urgent help, please call us directly.',
    emergencyReply: "This sounds urgent — I'm connecting you with our team right now. Someone will call you shortly. If this is a life-threatening emergency, please call 911.",
    fallback: "Thanks for your message! Someone from our team will get back to you shortly.",
    missedCallText: (company) =>
      `Hi! This is ${company}. Sorry we missed your call. How can we help? Reply here and I can get you scheduled. (Reply STOP to opt out.)`,
    voiceGreeting: (company) =>
      `Thank you for calling ${company}. I'm Jenny, the virtual assistant. How can I help you today?`,
    voiceMissed: (company) =>
      `Sorry we couldn't take your call. ${company} will text you right now so we can help. Goodbye.`,
    bookingConfirmed: ({ name, service, date, time, company }) =>
      `Hi ${name}! Your ${service} appointment with ${company} is confirmed for ${date} at ${time}. Reply STOP to opt out.`,
  },
  es: {
    optOutConfirm: 'Te has dado de baja y ya no recibirás mensajes. Responde START para volver a suscribirte.',
    optInConfirm: 'Estás suscrito de nuevo. ¿Cómo podemos ayudarte hoy?',
    help: 'Este es un asistente automático. Responde STOP para darte de baja. Si es urgente, por favor llámanos directamente.',
    emergencyReply: 'Esto parece urgente — te estoy comunicando con nuestro equipo ahora mismo. Alguien te llamará en breve. Si es una emergencia de vida o muerte, llama al 911.',
    fallback: '¡Gracias por tu mensaje! Alguien de nuestro equipo te responderá muy pronto.',
    missedCallText: (company) =>
      `¡Hola! Habla ${company}. Lamentamos no haber contestado tu llamada. ¿En qué podemos ayudarte? Respóndeme aquí y te agendo una cita. (Responde STOP para darte de baja.)`,
    voiceGreeting: (company) =>
      `Gracias por llamar a ${company}. Soy Jenny, la asistente virtual. ¿En qué puedo ayudarte hoy?`,
    voiceMissed: (company) =>
      `Lamentamos no poder contestar tu llamada. ${company} te enviará un mensaje de texto ahora mismo para ayudarte. Adiós.`,
    bookingConfirmed: ({ name, service, date, time, company }) =>
      `¡Hola ${name}! Tu cita de ${service} con ${company} está confirmada para el ${date} a las ${time}. Responde STOP para darte de baja.`,
  },
};

/**
 * Get the localized string bundle for a language.
 * @param {'en'|'es'} lang
 */
function t(lang) {
  return STRINGS[lang === 'es' ? 'es' : 'en'];
}

// Inbound keyword compliance (Twilio Advanced Opt-Out also handles these, but
// we recognize them so Jenny never tries to "book" an opt-out message).
const STOP_WORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'baja', 'parar'];
const START_WORDS = ['start', 'unstop', 'yes', 'alta'];
const HELP_WORDS = ['help', 'info', 'ayuda'];

function classifyKeyword(text) {
  const word = (text || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  if (STOP_WORDS.includes(word)) return 'stop';
  if (START_WORDS.includes(word)) return 'start';
  if (HELP_WORDS.includes(word)) return 'help';
  return null;
}

module.exports = {
  detectLanguage,
  resolveReplyLanguage,
  classifyKeyword,
  t,
};
