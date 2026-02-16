'use client';

import { Maximize2, Monitor, Smartphone } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ensureReadableColor } from '@/lib/color-utils';

export default function SitePreviewFrame({ wizardData }) {
  const [viewMode, setViewMode] = useState('desktop');
  const [fullscreen, setFullscreen] = useState(false);

  const {
    businessName = 'Your Business',
    tagline = '',
    phone = '',
    email = '',
    services = [],
    colors = {},
    enabledSections = [],
    heroImage = null,
    galleryImages = [],
    trade = '',
    serviceArea = '',
    licenseNumber = '',
    yearsInBusiness = '',
    fontHeading = 'Inter',
    fontBody = 'Inter',
    ctaText = 'Get a Free Estimate',
    emergencyText = '',
    stormText = '',
  } = wizardData;

  const primaryColor = colors.primary || '#1a1a2e';
  const secondaryColor = colors.secondary || '#16213e';
  const accentColor = colors.accent || '#f5a623';
  const bgColor = colors.background || '#ffffff';
  // Ensure heading/body colors are readable on light section backgrounds
  const headingColor = ensureReadableColor(colors.headingColor || primaryColor, '#ffffff', primaryColor);
  const bodyColor = ensureReadableColor(colors.bodyColor || '#333333', '#ffffff', '#333333');

  const fh = fontHeading || 'Inter';
  const fb = fontBody || 'Inter';
  const fontsParam = encodeURIComponent(fh) + ':wght@400;700;800&family=' + encodeURIComponent(fb) + ':wght@400;500;600';

  const heroBackground = heroImage?.url
    ? `background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('${heroImage.url}') center/cover no-repeat;`
    : `background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);`;

  const servicesHtml = services.map((s) =>
    `<div style="padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-align:center;font-size:15px;font-weight:500;color:${bodyColor};background:#fff;">${s}</div>`
  ).join('');

  const galleryHtml = galleryImages.length > 0
    ? galleryImages.map((img, i) =>
      `<div style="border-radius:12px;overflow:hidden;"><img src="${img.url || img}" alt="${img.alt || 'Project ' + (i + 1)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;" /></div>`
    ).join('')
    : '';

  const previewHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontsParam}&display=swap" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${fb}, -apple-system, BlinkMacSystemFont, sans-serif; color: ${bodyColor}; background: ${bgColor}; min-height: 100vh; }
  </style>
</head>
<body>
  <!-- Navigation -->
  <nav style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:${primaryColor};position:sticky;top:0;z-index:100;">
    <span style="color:#fff;font-weight:700;font-size:18px;font-family:${fh},sans-serif;">${businessName}</span>
    <div style="display:flex;align-items:center;gap:16px;">
      ${phone ? `<a href="tel:${phone}" style="color:${accentColor};font-weight:600;font-size:14px;text-decoration:none;">${phone}</a>` : ''}
      <a href="#contact" style="background:${accentColor};color:${primaryColor};padding:8px 20px;border-radius:6px;font-weight:700;font-size:13px;text-decoration:none;">Contact Us</a>
    </div>
  </nav>

  ${enabledSections.includes('hero') ? `
  <!-- Hero -->
  <section style="position:relative;padding:80px 24px;text-align:center;color:#fff;${heroBackground}min-height:420px;display:flex;flex-direction:column;justify-content:center;align-items:center;">
    <h1 style="font-size:clamp(28px,5vw,48px);font-weight:800;margin-bottom:16px;font-family:${fh},sans-serif;line-height:1.2;max-width:800px;color:#fff;">${businessName}</h1>
    ${tagline ? `<p style="font-size:clamp(16px,2.5vw,22px);opacity:0.92;margin-bottom:32px;max-width:600px;line-height:1.5;color:#fff;">${tagline}</p>` : ''}
    <a href="#contact" style="display:inline-block;padding:14px 36px;background:${accentColor};color:${primaryColor};font-weight:700;border-radius:8px;font-size:16px;text-decoration:none;">${ctaText}</a>
    ${serviceArea ? `<p style="margin-top:20px;font-size:14px;opacity:0.8;color:#fff;">Proudly serving ${serviceArea}</p>` : ''}
  </section>
  ` : ''}

  ${enabledSections.includes('emergency-banner') || enabledSections.includes('storm-banner') ? `
  <!-- Emergency / Storm Banner -->
  <section style="background:${accentColor};color:${primaryColor};padding:16px 24px;text-align:center;font-weight:700;font-size:15px;">
    ${emergencyText || stormText || '24/7 Emergency Service Available'}${phone ? ` &mdash; <a href="tel:${phone}" style="color:${primaryColor};text-decoration:underline;">Call ${phone}</a>` : ''}
  </section>
  ` : ''}

  ${enabledSections.includes('services') && services.length > 0 ? `
  <!-- Services -->
  <section style="padding:64px 24px;max-width:1000px;margin:0 auto;">
    <h2 style="font-size:28px;font-weight:700;text-align:center;margin-bottom:40px;color:${headingColor};font-family:${fh},sans-serif;">Our Services</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
      ${servicesHtml}
    </div>
  </section>
  ` : ''}

  ${enabledSections.includes('gallery') && galleryImages.length > 0 ? `
  <!-- Gallery -->
  <section style="padding:64px 24px;background:#f9fafb;">
    <div style="max-width:1000px;margin:0 auto;">
      <h2 style="font-size:28px;font-weight:700;text-align:center;margin-bottom:40px;color:${headingColor};font-family:${fh},sans-serif;">Our Work</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;">
        ${galleryHtml}
      </div>
    </div>
  </section>
  ` : ''}

  ${enabledSections.includes('about') ? `
  <!-- About -->
  <section style="padding:64px 24px;background:#f9fafb;">
    <div style="max-width:700px;margin:0 auto;text-align:center;">
      <h2 style="font-size:28px;font-weight:700;margin-bottom:20px;color:${headingColor};font-family:${fh},sans-serif;">About ${businessName}</h2>
      <p style="font-size:16px;color:#4b5563;line-height:1.7;">
        ${yearsInBusiness ? `With ${yearsInBusiness} years of experience, we` : 'We'}
        take pride in delivering quality ${trade || 'service'} work to our community.${serviceArea ? ` Serving ${serviceArea} and surrounding areas.` : ''}
        Our team is dedicated to providing professional, reliable results on every project.
      </p>
      ${licenseNumber ? `<p style="margin-top:16px;font-size:13px;color:#6b7280;">License #${licenseNumber}</p>` : ''}
    </div>
  </section>
  ` : ''}

  ${enabledSections.includes('reviews') || enabledSections.includes('testimonials') ? `
  <!-- Reviews -->
  <section style="padding:64px 24px;max-width:800px;margin:0 auto;">
    <h2 style="font-size:28px;font-weight:700;text-align:center;margin-bottom:40px;color:${headingColor};font-family:${fh},sans-serif;">What Our Customers Say</h2>
    <div style="display:grid;gap:16px;">
      ${[
        { text: 'Great work and very professional. Highly recommend!', author: 'Happy Customer' },
        { text: 'On time, on budget, and the quality exceeded our expectations.', author: 'Satisfied Client' },
        { text: "We\\u2019ve used them for years \\u2014 always dependable and fair pricing.", author: 'Loyal Customer' },
      ].map(r => `
        <div style="padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;">
          <div style="color:${accentColor};font-size:18px;margin-bottom:8px;">\\u2605\\u2605\\u2605\\u2605\\u2605</div>
          <p style="font-size:15px;color:${bodyColor};line-height:1.6;">\\u201c${r.text}\\u201d</p>
          <p style="font-size:13px;color:#6b7280;margin-top:8px;">\\u2014 ${r.author}</p>
        </div>
      `).join('')}
    </div>
  </section>
  ` : ''}

  ${enabledSections.includes('contact') ? `
  <!-- Contact -->
  <section id="contact" style="padding:64px 24px;background:#f9fafb;">
    <div style="max-width:560px;margin:0 auto;">
      <h2 style="font-size:28px;font-weight:700;text-align:center;margin-bottom:32px;color:${headingColor};font-family:${fh},sans-serif;">Get In Touch</h2>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <input style="width:100%;padding:12px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;background:#fff;box-sizing:border-box;" placeholder="Your Name *" disabled />
        <input style="width:100%;padding:12px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;background:#fff;box-sizing:border-box;" placeholder="Phone Number" disabled />
        <input style="width:100%;padding:12px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;background:#fff;box-sizing:border-box;" placeholder="Email Address" disabled />
        <input style="width:100%;padding:12px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;background:#fff;box-sizing:border-box;" placeholder="Service Needed" disabled />
        <textarea style="width:100%;padding:12px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;background:#fff;box-sizing:border-box;resize:vertical;" rows="4" placeholder="Tell us about your project..." disabled></textarea>
        <button style="width:100%;padding:14px;background:${accentColor};color:${primaryColor};border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer;" disabled>Send Message</button>
      </div>
    </div>
  </section>
  ` : ''}

  <!-- Footer -->
  <footer style="background:${primaryColor};color:#fff;padding:32px 24px;text-align:center;">
    <p style="font-weight:700;font-size:16px;margin-bottom:8px;">${businessName}</p>
    <div style="display:flex;justify-content:center;gap:24px;font-size:14px;opacity:0.85;">
      ${phone ? `<a href="tel:${phone}" style="color:${accentColor};text-decoration:none;">${phone}</a>` : ''}
      ${email ? `<a href="mailto:${email}" style="color:${accentColor};text-decoration:none;">${email}</a>` : ''}
    </div>
    <p style="margin-top:16px;font-size:12px;opacity:0.6;">&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
    <p style="margin-top:8px;font-size:11px;opacity:0.4;">Powered by <a href="https://tooltimepro.com" style="color:${accentColor};text-decoration:none;">ToolTime Pro</a></p>
  </footer>
</body>
</html>`;

  // Write directly to iframe document so changes always render immediately
  const iframeRef = useRef(null);
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  const containerClass = fullscreen
    ? 'fixed inset-0 z-50 bg-white flex flex-col'
    : 'border border-gray-200 rounded-xl overflow-hidden bg-white';

  return (
    <div className={containerClass}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded ${viewMode === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded ${viewMode === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Smartphone size={14} />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 rounded text-gray-400 hover:text-gray-600"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className={`flex-1 flex justify-center bg-gray-50 ${fullscreen ? '' : 'max-h-[500px]'} overflow-auto`}>
        <iframe
          ref={iframeRef}
          className={`border-0 bg-white transition-all duration-300 ${
            viewMode === 'mobile' ? 'w-[375px]' : 'w-full'
          } ${fullscreen ? 'h-full' : 'min-h-[400px]'}`}
          title="Website Preview"
        />
      </div>

      {/* Fullscreen close */}
      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="absolute top-3 right-3 btn-primary px-4 py-2 text-sm"
        >
          Close Preview
        </button>
      )}
    </div>
  );
}
