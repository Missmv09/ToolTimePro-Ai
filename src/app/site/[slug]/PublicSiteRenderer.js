'use client';

import { useState } from 'react';
import { ensureReadableColor } from '@/lib/color-utils';

export default function PublicSiteRenderer({ site, template, isBetaTester }) {
  const content = site.site_content || {};
  const defaultContent = template.default_content || {};
  const layout = template.layout_config || {};
  const sections = content.enabledSections || layout.sections || [
    'hero', 'services', 'gallery', 'about', 'contact',
  ];

  const businessName = site.business_name || 'Our Business';
  const phone = site.business_phone || '';
  const email = site.business_email || '';
  const tagline = content.tagline || defaultContent.heroSubtitle || '';
  const services = content.services || defaultContent.services || [];
  const ctaText = defaultContent.ctaText || 'Get a Free Estimate';
  const heroImage = content.heroImage || null;
  const galleryImages = content.galleryImages || [];
  const trade = content.trade || template.trade_category || '';
  const serviceArea = content.serviceArea || '';
  const licenseNumber = content.licenseNumber || '';
  const yearsInBusiness = content.yearsInBusiness || '';

  const primaryColor = content.colors?.primary || template.primary_color || '#1a1a2e';
  const secondaryColor = content.colors?.secondary || template.secondary_color || '#16213e';
  const accentColor = content.colors?.accent || template.accent_color || '#f5a623';
  const bgColor = content.colors?.background || '#ffffff';
  const rawHeadingColor = content.colors?.headingColor || primaryColor;
  const rawBodyColor = content.colors?.bodyColor || '#333333';
  const fontHeading = content.fontHeading || template.font_heading || 'Inter';
  const fontBody = content.fontBody || template.font_body || 'Inter';

  // Ensure text colors are readable on light section backgrounds.
  // Sections use either bgColor (page bg) or #f9fafb (alt sections).
  // Check against white (#ffffff) — the worst-case lightest background.
  const headingColor = ensureReadableColor(rawHeadingColor, '#ffffff', primaryColor);
  const bodyColor = ensureReadableColor(rawBodyColor, '#ffffff', '#333333');

  return (
    <div
      style={{
        fontFamily: `${fontBody}, -apple-system, BlinkMacSystemFont, sans-serif`,
        color: bodyColor,
        background: bgColor,
        minHeight: '100vh',
      }}
    >
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontHeading)}:wght@400;700;800&family=${encodeURIComponent(fontBody)}:wght@400;500;600&display=swap`}
      />

      {/* Navigation */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: primaryColor,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <span
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '18px',
            fontFamily: `${fontHeading}, sans-serif`,
          }}
        >
          {businessName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {phone && (
            <a
              href={`tel:${phone}`}
              style={{
                color: accentColor,
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              {phone}
            </a>
          )}
          <a
            href="#contact"
            style={{
              background: accentColor,
              color: primaryColor,
              padding: '8px 20px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            Contact Us
          </a>
        </div>
      </nav>

      {/* Hero */}
      {sections.includes('hero') && (
        <section
          style={{
            position: 'relative',
            padding: '80px 24px',
            textAlign: 'center',
            color: '#fff',
            background: heroImage?.url
              ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('${heroImage.url}') center/cover no-repeat`
              : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            minHeight: '420px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 800,
              marginBottom: '16px',
              fontFamily: `${fontHeading}, sans-serif`,
              lineHeight: 1.2,
              maxWidth: '800px',
            }}
          >
            {businessName}
          </h1>
          {tagline && (
            <p
              style={{
                fontSize: 'clamp(16px, 2.5vw, 22px)',
                opacity: 0.92,
                marginBottom: '32px',
                maxWidth: '600px',
                lineHeight: 1.5,
              }}
            >
              {tagline}
            </p>
          )}
          <a
            href="#contact"
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: accentColor,
              color: primaryColor,
              fontWeight: 700,
              borderRadius: '8px',
              fontSize: '16px',
              textDecoration: 'none',
              transition: 'transform 0.2s',
            }}
          >
            {ctaText}
          </a>
          {serviceArea && (
            <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
              Proudly serving {serviceArea}
            </p>
          )}
        </section>
      )}

      {/* Emergency / Storm Banner */}
      {(sections.includes('emergency-banner') || sections.includes('storm-banner')) && (
        <section
          style={{
            background: accentColor,
            color: primaryColor,
            padding: '16px 24px',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '15px',
          }}
        >
          {defaultContent.emergencyText || defaultContent.stormText || '24/7 Emergency Service Available'}
          {phone && (
            <>
              {' — '}
              <a
                href={`tel:${phone}`}
                style={{ color: primaryColor, textDecoration: 'underline' }}
              >
                Call {phone}
              </a>
            </>
          )}
        </section>
      )}

      {/* Services */}
      {sections.includes('services') && services.length > 0 && (
        <section style={{ padding: '64px 24px', maxWidth: '1000px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '40px',
              color: headingColor,
              fontFamily: `${fontHeading}, sans-serif`,
            }}
          >
            Our Services
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {services.map((service, i) => (
              <div
                key={i}
                style={{
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: bodyColor,
                  background: '#fff',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {service}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {sections.includes('gallery') && galleryImages.length > 0 && (
        <section style={{ padding: '64px 24px', background: '#f9fafb' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '40px',
                color: headingColor,
                fontFamily: `${fontHeading}, sans-serif`,
              }}
            >
              Our Work
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
              }}
            >
              {galleryImages.map((img, i) => (
                <div key={i} style={{ borderRadius: '12px', overflow: 'hidden' }}>
                  <img
                    src={img.url || img}
                    alt={img.alt || `Project ${i + 1}`}
                    style={{
                      width: '100%',
                      aspectRatio: '4/3',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {sections.includes('about') && (
        <section style={{ padding: '64px 24px', background: '#f9fafb' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                marginBottom: '20px',
                color: headingColor,
                fontFamily: `${fontHeading}, sans-serif`,
              }}
            >
              About {businessName}
            </h2>
            <p style={{ fontSize: '16px', color: '#4b5563', lineHeight: 1.7 }}>
              {yearsInBusiness
                ? `With ${yearsInBusiness} years of experience, we`
                : 'We'}{' '}
              take pride in delivering quality {trade || 'service'} work to our community.
              {serviceArea ? ` Serving ${serviceArea} and surrounding areas.` : ''}{' '}
              Our team is dedicated to providing professional, reliable results on every project.
            </p>
            {licenseNumber && (
              <p style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
                License #{licenseNumber}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Reviews / Testimonials */}
      {(sections.includes('reviews') || sections.includes('testimonials')) && (
        <section style={{ padding: '64px 24px', maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '40px',
              color: headingColor,
              fontFamily: `${fontHeading}, sans-serif`,
            }}
          >
            What Our Customers Say
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {[
              { text: 'Great work and very professional. Highly recommend!', author: 'Happy Customer' },
              { text: 'On time, on budget, and the quality exceeded our expectations.', author: 'Satisfied Client' },
              { text: 'We\'ve used them for years — always dependable and fair pricing.', author: 'Loyal Customer' },
            ].map((review, i) => (
              <div
                key={i}
                style={{
                  padding: '24px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  background: '#fff',
                }}
              >
                <div style={{ color: accentColor, fontSize: '18px', marginBottom: '8px' }}>
                  {'★'.repeat(5)}
                </div>
                <p style={{ fontSize: '15px', color: bodyColor, lineHeight: 1.6 }}>
                  &ldquo;{review.text}&rdquo;
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                  &mdash; {review.author}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact Form */}
      {sections.includes('contact') && (
        <section
          id="contact"
          style={{ padding: '64px 24px', background: '#f9fafb' }}
        >
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '32px',
                color: headingColor,
                fontFamily: `${fontHeading}, sans-serif`,
              }}
            >
              Get In Touch
            </h2>
            <ContactForm
              siteId={site.id}
              accentColor={accentColor}
              primaryColor={primaryColor}
            />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        style={{
          background: primaryColor,
          color: '#fff',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
          {businessName}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '14px', opacity: 0.85 }}>
          {phone && (
            <a href={`tel:${phone}`} style={{ color: accentColor, textDecoration: 'none' }}>
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} style={{ color: accentColor, textDecoration: 'none' }}>
              {email}
            </a>
          )}
        </div>
        <p style={{ marginTop: '16px', fontSize: '12px', opacity: 0.6 }}>
          &copy; {new Date().getFullYear()} {businessName}. All rights reserved.
        </p>
        <p style={{ marginTop: '8px', fontSize: '11px', opacity: 0.4 }}>
          Powered by <a href="https://tooltimepro.com" style={{ color: accentColor, textDecoration: 'none' }}>ToolTime Pro</a>
        </p>
      </footer>

      {/* Jenny Chat Widget — auto-included for beta testers */}
      {isBetaTester && (
        <JennyChatWidget
          businessName={businessName}
          phone={phone}
          accentColor={accentColor}
          trade={trade}
        />
      )}
    </div>
  );
}

function JennyChatWidget({ businessName, phone, accentColor, trade }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const greeting = `Hi! I'm Jenny, ${businessName}'s virtual assistant. How can I help you today?`;

  const quickReplies = [
    'What services do you offer?',
    'How do I get a quote?',
    phone ? 'Can I speak to someone?' : null,
  ].filter(Boolean);

  const handleSend = (text) => {
    const msg = text || input.trim();
    if (!msg) return;

    setMessages((prev) => [...prev, { from: 'user', text: msg }]);
    setInput('');

    // Simple auto-responses
    setTimeout(() => {
      let reply;
      const lower = msg.toLowerCase();
      if (lower.includes('quote') || lower.includes('estimate') || lower.includes('price')) {
        reply = `I'd be happy to help you get a quote! You can fill out our contact form below, or ${phone ? `call us at ${phone}` : 'send us a message'} and we'll get back to you right away.`;
      } else if (lower.includes('service') || lower.includes('offer') || lower.includes('do you')) {
        reply = `We provide professional ${trade || 'home service'} work. Check out our Services section above for the full list! Want a free estimate?`;
      } else if (lower.includes('speak') || lower.includes('call') || lower.includes('phone') || lower.includes('person')) {
        reply = phone
          ? `Of course! You can reach us at ${phone}. We're happy to help!`
          : `You can reach us through the contact form below and we'll get back to you ASAP!`;
      } else if (lower.includes('hour') || lower.includes('open') || lower.includes('available')) {
        reply = `We're typically available Monday through Saturday. For the fastest response, ${phone ? `give us a call at ${phone}` : 'fill out the contact form below'}!`;
      } else {
        reply = `Thanks for your message! For the best help, ${phone ? `call us at ${phone} or ` : ''}fill out our contact form below and we'll get back to you shortly.`;
      }
      setMessages((prev) => [...prev, { from: 'bot', text: reply }]);
    }, 800);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            width: '340px',
            maxHeight: '480px',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            marginBottom: '12px',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              background: accentColor,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Jenny</div>
              <div style={{ fontSize: '11px', opacity: 0.85 }}>{businessName}</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px',
                opacity: 0.8,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: '14px',
              overflowY: 'auto',
              background: '#f9fafb',
              minHeight: '240px',
              maxHeight: '320px',
            }}
          >
            {/* Greeting */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: accentColor + '22',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                🤖
              </div>
              <div
                style={{
                  background: '#fff',
                  borderRadius: '14px 14px 14px 4px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#374151',
                  maxWidth: '240px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: '1px solid #f3f4f6',
                }}
              >
                {greeting}
              </div>
            </div>

            {/* Quick Replies (shown when no user messages yet) */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginLeft: '36px' }}>
                {quickReplies.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(qr)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '14px',
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

            {/* Conversation */}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                {msg.from === 'bot' && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: accentColor + '22',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      flexShrink: 0,
                    }}
                  >
                    🤖
                  </div>
                )}
                <div
                  style={{
                    background: msg.from === 'user' ? accentColor : '#fff',
                    color: msg.from === 'user' ? '#fff' : '#374151',
                    borderRadius: msg.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    maxWidth: '220px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: msg.from === 'user' ? 'none' : '1px solid #f3f4f6',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{
              padding: '10px 12px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px',
              background: '#fff',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '8px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '20px',
                fontSize: '13px',
                outline: 'none',
                background: '#f9fafb',
              }}
            />
            <button
              type="submit"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: accentColor,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ↑
            </button>
          </form>
        </div>
      )}

      {/* Floating Bubble */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: accentColor,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
          marginLeft: 'auto',
        }}
      >
        {isOpen ? '×' : '💬'}
      </div>
    </div>
  );
}

function ContactForm({ siteId, accentColor, primaryColor }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', service: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/website-builder/leads/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          message: form.message,
          service: form.service,
          source: 'website_contact_form',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setForm({ name: '', phone: '', email: '', message: '', service: '' });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div
        style={{
          padding: '32px',
          background: '#ecfdf5',
          borderRadius: '12px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#10003;</div>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#065f46', marginBottom: '8px' }}>
          Message Sent!
        </h3>
        <p style={{ color: '#047857' }}>
          Thank you for reaching out. We&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        type="text"
        placeholder="Your Name *"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
        style={inputStyle}
      />
      <input
        type="tel"
        placeholder="Phone Number"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        style={inputStyle}
      />
      <input
        type="email"
        placeholder="Email Address"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Service Needed"
        value={form.service}
        onChange={(e) => setForm({ ...form, service: e.target.value })}
        style={inputStyle}
      />
      <textarea
        placeholder="Tell us about your project..."
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        rows={4}
        style={{ ...inputStyle, resize: 'vertical' }}
      />

      {status === 'error' && (
        <p style={{ color: '#dc2626', fontSize: '14px' }}>{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        style={{
          width: '100%',
          padding: '14px',
          background: status === 'sending' ? '#9ca3af' : accentColor,
          color: primaryColor,
          border: 'none',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '16px',
          cursor: status === 'sending' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'sending' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
