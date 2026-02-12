'use client';

import { useState } from 'react';

export default function PublicSiteContact({ siteId, primaryColor, accentColor, services }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setStatus('sending');

    try {
      const res = await fetch('/api/website-builder/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          service: form.service,
          message: form.message,
          source: 'website_contact_form',
        }),
      });

      if (res.ok) {
        setStatus('sent');
        setForm({ name: '', phone: '', email: '', service: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div style={{
        maxWidth: 500, margin: '0 auto', padding: 40, background: '#fff',
        borderRadius: 16, textAlign: 'center', border: '1px solid #e5e7eb',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: primaryColor, marginBottom: 8 }}>
          Message Sent!
        </h3>
        <p style={{ color: '#6b7280', fontSize: 15 }}>
          Thank you for reaching out. We&apos;ll get back to you as soon as possible.
        </p>
        <button
          onClick={() => setStatus('idle')}
          style={{
            marginTop: 20, padding: '10px 24px', background: 'transparent',
            border: `1px solid ${primaryColor}`, color: primaryColor, borderRadius: 8,
            fontWeight: 600, cursor: 'pointer', fontSize: 14,
          }}
        >
          Send Another Message
        </button>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          style={inputStyle}
          placeholder="Your Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          style={inputStyle}
          placeholder="Phone Number"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          style={inputStyle}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {services.length > 0 && (
          <select
            style={{ ...inputStyle, color: form.service ? '#333' : '#9ca3af' }}
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
          >
            <option value="">Select a Service</option>
            {services.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
        )}
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
          placeholder="Tell us about your project..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={4}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          style={{
            width: '100%', padding: '14px', background: accentColor, color: primaryColor,
            border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16,
            cursor: status === 'sending' ? 'not-allowed' : 'pointer',
            opacity: status === 'sending' ? 0.7 : 1,
          }}
        >
          {status === 'sending' ? 'Sending...' : 'Send Message'}
        </button>
        {status === 'error' && (
          <p style={{ color: '#dc2626', fontSize: 14, textAlign: 'center' }}>
            Something went wrong. Please try again or give us a call.
          </p>
        )}
      </div>
    </form>
  );
}
