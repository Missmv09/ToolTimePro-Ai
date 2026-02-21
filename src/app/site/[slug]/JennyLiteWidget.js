'use client';

import { useState, useRef, useEffect } from 'react';

/*
 * Jenny Chat Widget — Renders on public ToolTime Pro sites.
 *
 * Tier behaviour on the customer-facing widget:
 *   Jenny Lite  (free)    – Chat, FAQ answering, basic lead capture.
 *   Jenny Pro   ($49/mo)  – Everything Lite + direct booking flow,
 *                           SMS/call mentions, emergency escalation,
 *                           bilingual EN/ES, smarter responses.
 *   Jenny Exec  ($79/mo)  – Owner-only (not shown in customer widget).
 *
 * Beta testers (isBetaTester=true) get Lite + Pro unlocked automatically.
 */

// ── Translations ────────────────────────────────────────────────

const i18n = {
  en: {
    greeting: (biz) =>
      `Hi! I'm Jenny, the virtual assistant for ${biz}. How can I help you today?`,
    greetingPro: (biz) =>
      `Hi! I'm Jenny AI, the smart assistant for ${biz}. I can answer questions, book appointments, send you a text, or connect you with our team. How can I help?`,
    online: 'Online',
    typePlaceholder: 'Type a message...',
    bookingPlaceholder: 'Type your answer...',
    poweredBy: 'Powered by ToolTime Pro',
    // Quick replies
    qrServices: 'What services do you offer?',
    qrQuote: 'How do I get a quote?',
    qrArea: 'What areas do you serve?',
    qrBook: 'Book an appointment',
    qrQuotePro: 'Get a free quote',
    qrTalk: 'Talk to someone',
    qrText: 'Text me info',
    // Booking flow
    bookStart: "I'd love to help you book an appointment! Let's get a few details. What's your name?",
    bookPhone: (name) => `Thanks ${name}! What's the best phone number to reach you?`,
    bookService: 'Got it. What service are you looking for?',
    bookTime: (svc) =>
      `Great — ${svc}. Do you have a preferred day or time? (e.g. "Monday morning", "this weekend", "ASAP")`,
    bookConfirm: (data, biz, phone) =>
      `Perfect! I've submitted your appointment request:\n\n` +
      `Name: ${data.name}\nPhone: ${data.phone}\nService: ${data.service}\nPreferred time: ${data.time}\n\n` +
      `Someone from ${biz} will confirm shortly.${phone ? ` You can also call us at ${phone}.` : ''}`,
    bookSmsNote: (data, biz) =>
      `\n\nWe'll also send a confirmation text to ${data.phone}.`,
    // Intents
    quoteProStart: "We'd love to get you a free estimate! Let me grab your details. What's your name?",
    quoteLiteAsk: "We'd love to get you a free estimate! Could you share your name and the best phone number to reach you? Our team will follow up quickly.",
    servicesPro: (biz, phone) =>
      `${biz} offers a full range of professional services. I can book an appointment for you, get you a quote, or send details to your phone.${phone ? ` You can also call us at ${phone}.` : ''}`,
    servicesLite: (biz, phone) =>
      `${biz} offers a full range of professional services. For specific questions or to discuss your project, leave your name and number and we'll get back to you${phone ? ` — or call us at ${phone}` : ''}.`,
    areaPro: (biz, phone) =>
      `Great question! ${biz} serves the local area and surrounding communities. Want me to book a consultation or send you details via text?${phone ? ` Or call us at ${phone}.` : ''}`,
    areaLite: (biz, phone) =>
      `Great question! For details on our service area, leave your info and someone from ${biz} will reach out.${phone ? ` Or give us a call at ${phone}.` : ''}`,
    hoursPro: "Our team is typically available during business hours, but I'm here 24/7! Want me to book you an appointment or text you our hours?",
    hoursLite: "Our team is typically available during business hours, but I'm here 24/7! Leave your name and number and we'll get back to you during our next available slot.",
    bookLite: "I can help you get an appointment set up! What's your name and the best number to reach you?",
    contactWithPhone: (biz, phone) =>
      `You can reach ${biz} at ${phone}. Or I can book an appointment for you right here!`,
    contactWithPhoneLite: (biz, phone) =>
      `You can reach ${biz} at ${phone}. Or leave your info here and we'll call you!`,
    contactNoPhone: (biz) =>
      `Leave your name and phone number here and someone from ${biz} will contact you shortly.`,
    emergencyWithPhone: (biz, phone) =>
      `For urgent needs, please call ${biz} directly at ${phone}. If it's after hours, leave a message and we'll get back to you as soon as possible.`,
    emergencyNoPhone: (biz) =>
      `I understand this is urgent. Leave your name and phone number and the ${biz} team will prioritize your request.`,
    talkToWithPhone: (biz, phone) =>
      `Of course! You can reach the ${biz} team directly at ${phone}. Or leave your name and number here and someone will call you right back.`,
    talkToNoPhone: (biz) =>
      `I'll connect you with the team. Leave your name and phone number and someone from ${biz} will call you back shortly.`,
    textMe: (biz) =>
      `Sure! Leave your phone number and I'll have the ${biz} team text you the details.`,
    thanks: 'You\'re welcome! Is there anything else I can help you with? I can book appointments, get you a quote, or text you info.',
    helloMenu: (biz) =>
      `Hello! Welcome to ${biz}. I can help you book an appointment, get a quote, or answer any questions. What would you like to do?`,
    leadCaptured: (biz, phone) =>
      `Thanks! I've passed your info along to the ${biz} team. Someone will reach out to you shortly.${phone ? ` You can also call us anytime at ${phone}.` : ''}`,
    defaultPro: (biz) =>
      `Thanks for reaching out! I'd love to help. Let me connect you with the ${biz} team. What's your name?`,
    defaultLite: (biz) =>
      `Thanks for reaching out! I'd be happy to connect you with the ${biz} team. Could you share your name and phone number so someone can follow up?`,
    langSwitch: 'Español',
  },
  es: {
    greeting: (biz) =>
      `¡Hola! Soy Jenny, la asistente virtual de ${biz}. ¿En qué puedo ayudarle hoy?`,
    greetingPro: (biz) =>
      `¡Hola! Soy Jenny AI, la asistente inteligente de ${biz}. Puedo responder preguntas, agendar citas, enviarle un mensaje de texto o conectarle con nuestro equipo. ¿En qué puedo ayudarle?`,
    online: 'En línea',
    typePlaceholder: 'Escribe un mensaje...',
    bookingPlaceholder: 'Escribe tu respuesta...',
    poweredBy: 'Powered by ToolTime Pro',
    qrServices: '¿Qué servicios ofrecen?',
    qrQuote: '¿Cómo obtengo un presupuesto?',
    qrArea: '¿Qué áreas cubren?',
    qrBook: 'Agendar una cita',
    qrQuotePro: 'Obtener presupuesto gratis',
    qrTalk: 'Hablar con alguien',
    qrText: 'Envíenme info por texto',
    bookStart: '¡Me encantaría ayudarle a agendar una cita! Necesito algunos datos. ¿Cuál es su nombre?',
    bookPhone: (name) => `¡Gracias ${name}! ¿Cuál es el mejor número de teléfono para contactarle?`,
    bookService: 'Entendido. ¿Qué servicio necesita?',
    bookTime: (svc) =>
      `Perfecto — ${svc}. ¿Tiene algún día u hora de preferencia? (ej. "lunes por la mañana", "este fin de semana", "lo antes posible")`,
    bookConfirm: (data, biz, phone) =>
      `¡Perfecto! He enviado su solicitud de cita:\n\n` +
      `Nombre: ${data.name}\nTeléfono: ${data.phone}\nServicio: ${data.service}\nHora preferida: ${data.time}\n\n` +
      `Alguien de ${biz} confirmará su cita pronto.${phone ? ` También puede llamarnos al ${phone}.` : ''}`,
    bookSmsNote: (data) =>
      `\n\nTambién enviaremos una confirmación por texto al ${data.phone}.`,
    quoteProStart: '¡Nos encantaría darle un presupuesto gratis! Déjeme tomar sus datos. ¿Cuál es su nombre?',
    quoteLiteAsk: '¡Nos encantaría darle un presupuesto gratis! ¿Podría compartir su nombre y el mejor número de teléfono para contactarle?',
    servicesPro: (biz, phone) =>
      `${biz} ofrece una amplia gama de servicios profesionales. Puedo agendar una cita, obtener un presupuesto, o enviar detalles a su teléfono.${phone ? ` También puede llamarnos al ${phone}.` : ''}`,
    servicesLite: (biz, phone) =>
      `${biz} ofrece una amplia gama de servicios profesionales. Para preguntas específicas, deje su nombre y número y nos comunicaremos con usted${phone ? ` — o llámenos al ${phone}` : ''}.`,
    areaPro: (biz, phone) =>
      `¡Buena pregunta! ${biz} sirve el área local y comunidades cercanas. ¿Quiere que agende una consulta o le envíe detalles por texto?${phone ? ` O llámenos al ${phone}.` : ''}`,
    areaLite: (biz, phone) =>
      `¡Buena pregunta! Para detalles sobre nuestra área de servicio, deje su información y alguien de ${biz} se comunicará.${phone ? ` O llámenos al ${phone}.` : ''}`,
    hoursPro: 'Nuestro equipo está disponible en horario laboral, ¡pero yo estoy aquí 24/7! ¿Quiere que agende una cita o le envíe nuestro horario por texto?',
    hoursLite: 'Nuestro equipo está disponible en horario laboral, ¡pero yo estoy aquí 24/7! Deje su nombre y número y le contactaremos.',
    bookLite: '¡Puedo ayudarle a agendar una cita! ¿Cuál es su nombre y el mejor número para contactarle?',
    contactWithPhone: (biz, phone) =>
      `Puede comunicarse con ${biz} al ${phone}. ¡O puedo agendar una cita aquí mismo!`,
    contactWithPhoneLite: (biz, phone) =>
      `Puede comunicarse con ${biz} al ${phone}. ¡O deje su información aquí y le llamaremos!`,
    contactNoPhone: (biz) =>
      `Deje su nombre y número de teléfono y alguien de ${biz} se comunicará pronto.`,
    emergencyWithPhone: (biz, phone) =>
      `Para necesidades urgentes, llame directamente a ${biz} al ${phone}. Si es fuera de horario, deje un mensaje y le contactaremos lo antes posible.`,
    emergencyNoPhone: (biz) =>
      `Entiendo que es urgente. Deje su nombre y número de teléfono y el equipo de ${biz} priorizará su solicitud.`,
    talkToWithPhone: (biz, phone) =>
      `¡Por supuesto! Puede comunicarse directamente con el equipo de ${biz} al ${phone}. O deje su nombre y número aquí.`,
    talkToNoPhone: (biz) =>
      `Le conectaré con el equipo. Deje su nombre y número de teléfono y alguien de ${biz} le llamará pronto.`,
    textMe: (biz) =>
      `¡Claro! Deje su número de teléfono y el equipo de ${biz} le enviará los detalles por texto.`,
    thanks: '¡De nada! ¿Hay algo más en que pueda ayudarle? Puedo agendar citas, obtener presupuestos, o enviarle información.',
    helloMenu: (biz) =>
      `¡Hola! Bienvenido a ${biz}. Puedo ayudarle a agendar una cita, obtener un presupuesto, o responder cualquier pregunta. ¿Qué le gustaría hacer?`,
    leadCaptured: (biz, phone) =>
      `¡Gracias! He pasado su información al equipo de ${biz}. Alguien se comunicará con usted pronto.${phone ? ` También puede llamarnos al ${phone}.` : ''}`,
    defaultPro: (biz) =>
      `¡Gracias por comunicarse! Me encantaría ayudarle. Déjeme conectarle con el equipo de ${biz}. ¿Cuál es su nombre?`,
    defaultLite: (biz) =>
      `¡Gracias por comunicarse! Nos encantaría conectarle con el equipo de ${biz}. ¿Podría compartir su nombre y número de teléfono?`,
    langSwitch: 'English',
  },
};

// ── Component ───────────────────────────────────────────────────

export default function JennyLiteWidget({
  businessName = 'Our Business',
  phone = '',
  accentColor = '#f5a623',
  position = 'right',
  isBetaTester = false,
  companyId = null,
  siteId = null,
}) {
  const hasPro = isBetaTester; // Pro features unlocked for beta testers

  const [lang, setLang] = useState('en');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [awaitingInfo, setAwaitingInfo] = useState(false);
  const [bookingStep, setBookingStep] = useState(null); // null | 'name' | 'phone' | 'service' | 'time'
  const [bookingData, setBookingData] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const t = i18n[lang];

  const leadSavedRef = useRef(false);

  const headerLabel = hasPro ? 'Jenny AI' : 'Jenny';

  // Build greeting based on tier
  const greeting = hasPro ? t.greetingPro(businessName) : t.greeting(businessName);

  // Quick replies differ by tier
  const quickReplies = hasPro
    ? [t.qrBook, t.qrServices, t.qrQuotePro, t.qrTalk]
    : [t.qrServices, t.qrQuote, t.qrArea];

  // Seed greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ sender: 'bot', text: greeting }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // ── Save lead to backend ──────────────────────────────────────

  function saveLead({ name, phoneNumber, service, chatTranscript }) {
    if (leadSavedRef.current) return;
    if (!siteId && !companyId) return;

    leadSavedRef.current = true;

    const transcriptText = chatTranscript
      .map((m) => `${m.sender === 'user' ? 'Customer' : 'Jenny AI'}: ${m.text}`)
      .join('\n');

    const payload = {
      name: name || 'Chat visitor',
      phone: phoneNumber || null,
      message: transcriptText || null,
      service: service || null,
      source: 'jenny_ai_chat',
    };
    if (siteId) payload.siteId = siteId;
    if (companyId) payload.companyId = companyId;

    fetch('/api/website-builder/leads/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => console.error('Jenny lead save error:', err));
  }

  // ── Language switch ────────────────────────────────────────────

  function switchLang() {
    const next = lang === 'en' ? 'es' : 'en';
    setLang(next);
    const nextT = i18n[next];
    const newGreeting = hasPro ? nextT.greetingPro(businessName) : nextT.greeting(businessName);
    // Reset conversation with new language greeting
    setMessages([{ sender: 'bot', text: newGreeting }]);
    setBookingStep(null);
    setBookingData({});
    setAwaitingInfo(false);
    setLeadCaptured(false);
  }

  // ── Booking flow (Pro / beta testers) ──────────────────────────

  function handleBookingFlow(userText) {
    switch (bookingStep) {
      case 'name':
        setBookingData((prev) => ({ ...prev, name: userText }));
        setBookingStep('phone');
        return t.bookPhone(userText);

      case 'phone':
        setBookingData((prev) => ({ ...prev, phone: userText }));
        setBookingStep('service');
        return t.bookService;

      case 'service':
        setBookingData((prev) => ({ ...prev, service: userText }));
        setBookingStep('time');
        return t.bookTime(userText);

      case 'time': {
        const finalData = { ...bookingData, time: userText };
        setBookingData(finalData);
        setBookingStep(null);
        setLeadCaptured(true);
        let msg = t.bookConfirm(finalData, businessName, phone);

        // Also save to website_leads so it appears in leads dashboard
        saveLead({
          name: finalData.name,
          phoneNumber: finalData.phone,
          service: finalData.service,
          chatTranscript: [...messages, { sender: 'user', text: userText }],
        });

        // Save booking to database (creates lead, job, customer, and sends SMS)
        if (companyId) {
          // Parse a rough date from user input (e.g. "Monday morning", "ASAP")
          // Default to tomorrow if we can't parse a specific date
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const scheduledDate = tomorrow.toISOString().split('T')[0];

          fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              serviceName: finalData.service,
              scheduledDate,
              scheduledTimeStart: '09:00',
              durationMinutes: 60,
              customerName: finalData.name,
              customerPhone: finalData.phone,
              notes: `Preferred time: ${finalData.time} (booked via Jenny AI chat)`,
            }),
          })
            .then((res) => {
              if (!res.ok) {
                return res.json().then((data) => {
                  console.error('Booking API error:', data);
                  setMessages((prev) => [
                    ...prev,
                    { sender: 'bot', text: `⚠️ There was an issue saving your booking: ${data.error || 'please try again'}. Your request has been noted — the team will follow up.` },
                  ]);
                });
              }
            })
            .catch((err) => {
              console.error('Booking save error:', err);
              setMessages((prev) => [
                ...prev,
                { sender: 'bot', text: '⚠️ We had trouble confirming your booking online. Don\'t worry — our team has your info and will reach out to confirm.' },
              ]);
            });

          if (hasPro) {
            msg += t.bookSmsNote(finalData, businessName);
          }
        }
        return msg;
      }

      default:
        return null;
    }
  }

  // ── Bot response logic ─────────────────────────────────────────

  function botReply(userText) {
    const lower = userText.toLowerCase();

    // Active booking flow takes priority
    if (bookingStep) {
      const reply = handleBookingFlow(userText);
      if (reply) return reply;
    }

    // Awaiting contact info (simple lead capture)
    if (awaitingInfo) {
      setAwaitingInfo(false);
      setLeadCaptured(true);

      // Extract phone number and name from user message
      const phoneMatch = userText.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10}/);
      const extractedPhone = phoneMatch ? phoneMatch[0] : null;
      // Rough name extraction: strip the phone number, take what remains
      const nameCandidate = userText.replace(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10}/g, '').replace(/[,.\-]/g, ' ').trim();
      const extractedName = nameCandidate.length >= 2 ? nameCandidate : null;

      saveLead({
        name: extractedName,
        phoneNumber: extractedPhone,
        service: null,
        chatTranscript: [...messages, { sender: 'user', text: userText }],
      });

      return t.leadCaptured(businessName, phone);
    }

    // ── Spanish detection (Pro) ──────────────────────────────────
    if (hasPro && lang === 'en' && /^(hola|buenos|necesito|quiero|tienen|hacen|cuánto)/i.test(lower)) {
      setLang('es');
      const esT = i18n.es;
      return esT.greetingPro(businessName);
    }

    // ── Booking / appointment (Pro: guided flow, Lite: simple capture) ──
    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') ||
        lower.includes('agendar') || lower.includes('cita')) {
      if (hasPro) {
        setBookingStep('name');
        return t.bookStart;
      }
      setAwaitingInfo(true);
      return t.bookLite;
    }

    // ── Talk to a person (Pro) ───────────────────────────────────
    if (hasPro && (lower.includes('talk to') || lower.includes('speak to') || lower.includes('real person') ||
        lower.includes('human') || lower.includes('hablar con'))) {
      setAwaitingInfo(true);
      return phone ? t.talkToWithPhone(businessName, phone) : t.talkToNoPhone(businessName);
    }

    // ── Text / SMS me (Pro) ──────────────────────────────────────
    if (hasPro && (lower.includes('text me') || lower.includes('sms') || lower.includes('enviar') ||
        lower.includes('texto') || lower.includes('mensaje'))) {
      setAwaitingInfo(true);
      return t.textMe(businessName);
    }

    // ── Quote / estimate ─────────────────────────────────────────
    if (lower.includes('quote') || lower.includes('estimate') || lower.includes('price') ||
        lower.includes('cost') || lower.includes('presupuesto') || lower.includes('precio')) {
      if (hasPro) {
        setBookingStep('name');
        return t.quoteProStart;
      }
      setAwaitingInfo(true);
      return t.quoteLiteAsk;
    }

    // ── Services ─────────────────────────────────────────────────
    if (lower.includes('service') || lower.includes('offer') || lower.includes('do you do') ||
        lower.includes('servicio') || lower.includes('ofrecen')) {
      return hasPro ? t.servicesPro(businessName, phone) : t.servicesLite(businessName, phone);
    }

    // ── Area / location ──────────────────────────────────────────
    if (lower.includes('area') || lower.includes('location') || lower.includes('where') ||
        lower.includes('serve') || lower.includes('zona') || lower.includes('área')) {
      return hasPro ? t.areaPro(businessName, phone) : t.areaLite(businessName, phone);
    }

    // ── Hours / availability ─────────────────────────────────────
    if (lower.includes('hour') || lower.includes('open') || lower.includes('available') ||
        lower.includes('when') || lower.includes('horario') || lower.includes('disponible')) {
      return hasPro ? t.hoursPro : t.hoursLite;
    }

    // ── Phone / call / contact ───────────────────────────────────
    if (lower.includes('phone') || lower.includes('call') || lower.includes('contact') ||
        lower.includes('llamar') || lower.includes('teléfono')) {
      if (!phone) return t.contactNoPhone(businessName);
      return hasPro
        ? t.contactWithPhone(businessName, phone)
        : t.contactWithPhoneLite(businessName, phone);
    }

    // ── Emergency / urgent (Pro) ─────────────────────────────────
    if (hasPro && (lower.includes('emergency') || lower.includes('urgent') || lower.includes('asap') ||
        lower.includes('emergencia') || lower.includes('urgente'))) {
      return phone ? t.emergencyWithPhone(businessName, phone) : t.emergencyNoPhone(businessName);
    }

    // ── Gratitude (Pro) ──────────────────────────────────────────
    if (hasPro && (lower.includes('thank') || lower.includes('thanks') || lower.includes('great') ||
        lower.includes('perfect') || lower.includes('gracias') || lower.includes('perfecto'))) {
      return t.thanks;
    }

    // ── Greetings (Pro) ──────────────────────────────────────────
    if (hasPro && lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening|hola|buenos|buenas)/)) {
      return t.helloMenu(businessName);
    }

    // ── Default fallback ─────────────────────────────────────────
    if (hasPro) {
      setBookingStep('name');
      return t.defaultPro(businessName);
    }
    setAwaitingInfo(true);
    return t.defaultLite(businessName);
  }

  // ── Send handler ───────────────────────────────────────────────

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg) return;

    setMessages((prev) => [...prev, { sender: 'user', text: msg }]);
    setInput('');

    setTimeout(() => {
      const reply = botReply(msg);
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, hasPro ? 400 : 600);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  const positionStyle = position === 'left' ? { left: 20 } : { right: 20 };

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            ...positionStyle,
            zIndex: 9999,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: accentColor,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              <span role="img" aria-label="bot">🤖</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                {headerLabel}
                {hasPro && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: 'rgba(255,255,255,0.25)',
                      padding: '2px 6px',
                      borderRadius: 8,
                      letterSpacing: '0.5px',
                    }}
                  >
                    PRO
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{businessName}</div>
            </div>

            {/* Language switcher (Pro only) */}
            {hasPro && (
              <button
                onClick={switchLang}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
                aria-label="Switch language"
              >
                {t.langSwitch}
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4ade80',
                }}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{t.online}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 20,
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
              aria-label="Close chat"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              background: '#f9fafb',
              maxHeight: 340,
              minHeight: 200,
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 10,
                }}
              >
                {msg.sender === 'bot' && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: accentColor + '22',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                      marginRight: 8,
                    }}
                  >
                    🤖
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.sender === 'user' ? accentColor : '#fff',
                    color: msg.sender === 'user' ? '#fff' : '#1f2937',
                    fontSize: 14,
                    lineHeight: 1.5,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e5e7eb',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Quick replies */}
            {messages.length === 1 && !leadCaptured && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 36, marginTop: 4 }}>
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qr)}
                    style={{
                      fontSize: 12,
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: `1px solid ${accentColor}`,
                      background: 'transparent',
                      color: accentColor,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: 12,
              borderTop: '1px solid #e5e7eb',
              background: '#fff',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={bookingStep ? t.bookingPlaceholder : t.typePlaceholder}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 24,
                border: 'none',
                background: '#f3f4f6',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: 'none',
                background: input.trim() ? accentColor : '#d1d5db',
                color: '#fff',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
              }}
              aria-label="Send"
            >
              &#8593;
            </button>
          </div>

          {/* Powered by */}
          <div
            style={{
              textAlign: 'center',
              padding: '6px 0',
              background: '#fff',
              borderTop: '1px solid #f3f4f6',
            }}
          >
            <a
              href="https://tooltimepro.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 10, color: '#9ca3af', textDecoration: 'none' }}
            >
              {t.poweredBy}
            </a>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 20,
          ...positionStyle,
          zIndex: 9998,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: accentColor,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          color: '#fff',
          transition: 'transform 0.2s',
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? '\u00D7' : '\uD83D\uDCAC'}
      </button>
    </>
  );
}
