'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * JennyLiteWidget — Floating AI chat widget rendered on public ToolTime Pro sites.
 *
 * Props:
 *   businessName  – company name shown in the header
 *   phone         – business phone (offered as quick action)
 *   accentColor   – brand color for the widget chrome
 *   position      – 'right' (default) or 'left'
 */
export default function JennyLiteWidget({
  businessName = 'Our Business',
  phone = '',
  accentColor = '#f5a623',
  position = 'right',
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [awaitingInfo, setAwaitingInfo] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const greeting = `Hi! I'm Jenny, the virtual assistant for ${businessName}. How can I help you today?`;

  const quickReplies = [
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

  function botReply(userText) {
    const lower = userText.toLowerCase();

    // If we're waiting for contact info, try to extract it
    if (awaitingInfo) {
      setAwaitingInfo(false);
      setLeadCaptured(true);
      return `Thanks! I've passed your info along to the ${businessName} team. Someone will reach out to you shortly.${phone ? ` You can also call us anytime at ${phone}.` : ''}`;
    }

    if (lower.includes('quote') || lower.includes('estimate') || lower.includes('price') || lower.includes('cost')) {
      setAwaitingInfo(true);
      return `We'd love to get you a free estimate! Could you share your name and the best phone number to reach you? Our team will follow up quickly.`;
    }

    if (lower.includes('service') || lower.includes('offer') || lower.includes('do you do')) {
      return `${businessName} offers a full range of professional services. For specific questions or to discuss your project, leave your name and number and we'll get back to you — or call us${phone ? ` at ${phone}` : ''}.`;
    }

    if (lower.includes('area') || lower.includes('location') || lower.includes('where') || lower.includes('serve')) {
      return `Great question! For details on our service area, leave your info and someone from ${businessName} will reach out.${phone ? ` Or give us a call at ${phone}.` : ''}`;
    }

    if (lower.includes('hour') || lower.includes('open') || lower.includes('available') || lower.includes('when')) {
      return `Our team is typically available during business hours, but I'm here 24/7! Leave your name and number and we'll get back to you during our next available slot.`;
    }

    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
      setAwaitingInfo(true);
      return `I can help you get an appointment set up! What's your name and the best number to reach you?`;
    }

    if (lower.includes('phone') || lower.includes('call') || lower.includes('contact')) {
      return phone
        ? `You can reach ${businessName} at ${phone}. Or leave your info here and we'll call you!`
        : `Leave your name and phone number here and someone from ${businessName} will contact you shortly.`;
    }

    // Default — nudge toward lead capture
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
    }, 600);
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
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Jenny</div>
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
              placeholder="Type a message..."
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
