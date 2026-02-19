'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Jenny Chat Widget — Floating AI chat widget rendered on public ToolTime Pro sites.
 *
 * Shows "Jenny AI" (full features) for beta testers, "Jenny Lite" for everyone else.
 *
 * Props:
 *   businessName  – company name shown in the header
 *   phone         – business phone (offered as quick action)
 *   accentColor   – brand color for the widget chrome
 *   position      – 'right' (default) or 'left'
 *   isBetaTester  – if true, unlocks full Jenny AI branding & features
 */
export default function JennyLiteWidget({
  businessName = 'Our Business',
  phone = '',
  accentColor = '#f5a623',
  position = 'right',
  isBetaTester = false,
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [awaitingInfo, setAwaitingInfo] = useState(false);
  const [bookingStep, setBookingStep] = useState(null); // null | 'name' | 'phone' | 'service' | 'time' | 'confirm'
  const [bookingData, setBookingData] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const jennyName = isBetaTester ? 'Jenny AI' : 'Jenny';
  const headerLabel = isBetaTester ? 'Jenny AI' : 'Jenny';

  const greeting = isBetaTester
    ? `Hi! I'm Jenny AI, the smart assistant for ${businessName}. I can answer questions, book appointments, and connect you with our team. How can I help?`
    : `Hi! I'm Jenny, the virtual assistant for ${businessName}. How can I help you today?`;

  const quickReplies = isBetaTester
    ? [
        'Book an appointment',
        'What services do you offer?',
        'Get a free quote',
        'Talk to someone',
      ]
    : [
        'What services do you offer?',
        'How do I get a quote?',
        'What areas do you serve?',
      ];

  // Seed the greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ sender: 'bot', text: greeting }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // ---- Booking flow (Jenny AI / beta testers only) ----

  function handleBookingFlow(userText) {
    const lower = userText.toLowerCase();

    switch (bookingStep) {
      case 'name':
        setBookingData((prev) => ({ ...prev, name: userText }));
        setBookingStep('phone');
        return `Thanks ${userText}! What's the best phone number to reach you?`;

      case 'phone':
        setBookingData((prev) => ({ ...prev, phone: userText }));
        setBookingStep('service');
        return `Got it. What service are you looking for?`;

      case 'service':
        setBookingData((prev) => ({ ...prev, service: userText }));
        setBookingStep('time');
        return `Great — ${userText}. Do you have a preferred day or time? (e.g. "Monday morning", "this weekend", "ASAP")`;

      case 'time':
        setBookingData((prev) => ({ ...prev, time: userText }));
        setBookingStep(null);
        setLeadCaptured(true);
        return `Perfect! I've submitted your appointment request:\n\n` +
          `Name: ${bookingData.name}\n` +
          `Phone: ${bookingData.phone}\n` +
          `Service: ${bookingData.service}\n` +
          `Preferred time: ${userText}\n\n` +
          `Someone from ${businessName} will confirm your appointment shortly.${phone ? ` You can also call us at ${phone}.` : ''}`;

      default:
        return null;
    }
  }

  // ---- Bot response logic ----

  function botReply(userText) {
    const lower = userText.toLowerCase();

    // If we're in a booking flow, handle that first
    if (bookingStep) {
      const bookingReply = handleBookingFlow(userText);
      if (bookingReply) return bookingReply;
    }

    // If we're waiting for contact info (non-booking lead capture)
    if (awaitingInfo) {
      setAwaitingInfo(false);
      setLeadCaptured(true);
      return `Thanks! I've passed your info along to the ${businessName} team. Someone will reach out to you shortly.${phone ? ` You can also call us anytime at ${phone}.` : ''}`;
    }

    // ---- Booking triggers (Jenny AI only) ----
    if (isBetaTester && (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule'))) {
      setBookingStep('name');
      return `I'd love to help you book an appointment! Let's get a few details. What's your name?`;
    }

    // ---- Talk to a person (Jenny AI only) ----
    if (isBetaTester && (lower.includes('talk to') || lower.includes('speak to') || lower.includes('real person') || lower.includes('human'))) {
      setAwaitingInfo(true);
      return phone
        ? `Of course! You can reach the ${businessName} team directly at ${phone}. Or leave your name and number here and someone will call you right back.`
        : `I'll connect you with the team. Leave your name and phone number and someone from ${businessName} will call you back shortly.`;
    }

    // ---- Common intents ----
    if (lower.includes('quote') || lower.includes('estimate') || lower.includes('price') || lower.includes('cost')) {
      if (isBetaTester) {
        setBookingStep('name');
        return `We'd love to get you a free estimate! Let me grab your details. What's your name?`;
      }
      setAwaitingInfo(true);
      return `We'd love to get you a free estimate! Could you share your name and the best phone number to reach you? Our team will follow up quickly.`;
    }

    if (lower.includes('service') || lower.includes('offer') || lower.includes('do you do')) {
      return `${businessName} offers a full range of professional services. ${isBetaTester ? 'I can book an appointment for you, or feel free to ask about specific services.' : 'For specific questions or to discuss your project, leave your name and number and we\'ll get back to you'} ${phone ? (isBetaTester ? `You can also call us at ${phone}.` : `— or call us at ${phone}.`) : '.'}`;
    }

    if (lower.includes('area') || lower.includes('location') || lower.includes('where') || lower.includes('serve')) {
      return isBetaTester
        ? `Great question! ${businessName} serves the local area and surrounding communities. Want me to book a consultation to discuss your specific location?${phone ? ` Or call us at ${phone}.` : ''}`
        : `Great question! For details on our service area, leave your info and someone from ${businessName} will reach out.${phone ? ` Or give us a call at ${phone}.` : ''}`;
    }

    if (lower.includes('hour') || lower.includes('open') || lower.includes('available') || lower.includes('when')) {
      return isBetaTester
        ? `Our team is typically available during business hours, but I'm here 24/7! Want me to book you an appointment for a convenient time?`
        : `Our team is typically available during business hours, but I'm here 24/7! Leave your name and number and we'll get back to you during our next available slot.`;
    }

    if (!isBetaTester && (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule'))) {
      setAwaitingInfo(true);
      return `I can help you get an appointment set up! What's your name and the best number to reach you?`;
    }

    if (lower.includes('phone') || lower.includes('call') || lower.includes('contact')) {
      return phone
        ? `You can reach ${businessName} at ${phone}. ${isBetaTester ? 'Or I can book an appointment for you right here!' : 'Or leave your info here and we\'ll call you!'}`
        : `Leave your name and phone number here and someone from ${businessName} will contact you shortly.`;
    }

    // ---- Jenny AI extras ----
    if (isBetaTester) {
      if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('asap')) {
        return phone
          ? `For urgent needs, please call ${businessName} directly at ${phone}. If it's after hours, leave a message and we'll get back to you as soon as possible.`
          : `I understand this is urgent. Leave your name and phone number and the ${businessName} team will prioritize your request.`;
      }

      if (lower.includes('thank') || lower.includes('thanks') || lower.includes('great') || lower.includes('perfect')) {
        return `You're welcome! Is there anything else I can help you with? I can book appointments, answer questions, or connect you with the team.`;
      }

      if (lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
        return `Hello! Welcome to ${businessName}. I can help you book an appointment, get a quote, or answer any questions. What would you like to do?`;
      }
    }

    // Default — nudge toward lead capture (or booking for beta testers)
    if (isBetaTester) {
      setBookingStep('name');
      return `Thanks for reaching out! I'd love to help. Let me connect you with the ${businessName} team. What's your name?`;
    }

    setAwaitingInfo(true);
    return `Thanks for reaching out! I'd be happy to connect you with the ${businessName} team. Could you share your name and phone number so someone can follow up?`;
  }

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg = { sender: 'user', text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulate typing delay
    setTimeout(() => {
      const reply = botReply(msg);
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, isBetaTester ? 400 : 600);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
                {isBetaTester && (
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
                    AI
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{businessName}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4ade80',
                }}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Online</span>
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
            {messages.map((msg, i) => (
              <div
                key={i}
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

            {/* Quick Replies (shown only at beginning) */}
            {messages.length === 1 && !leadCaptured && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 36, marginTop: 4 }}>
                {quickReplies.map((qr, i) => (
                  <button
                    key={i}
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
              placeholder={bookingStep ? 'Type your answer...' : 'Type a message...'}
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
              Powered by ToolTime Pro
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
