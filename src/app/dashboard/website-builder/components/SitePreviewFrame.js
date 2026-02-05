'use client';

import { Maximize2, Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';

export default function SitePreviewFrame({ wizardData }) {
  const [viewMode, setViewMode] = useState('desktop');
  const [fullscreen, setFullscreen] = useState(false);

  const {
    businessName = 'Your Business',
    tagline = '',
    phone = '',
    services = [],
    colors = {},
    enabledSections = [],
    heroImage = null,
  } = wizardData;

  const primaryColor = colors.primary || '#1a1a2e';
  const accentColor = colors.accent || '#f5a623';
  const bgColor = colors.background || '#ffffff';

  const previewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Inter, -apple-system, sans-serif; color: #333; background: ${bgColor}; }
        .hero { padding: 48px 24px; text-center; color: white; position: relative; }
        .hero-bg { background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); }
        .hero h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: white; }
        .hero p { font-size: 14px; opacity: 0.9; margin-bottom: 20px; color: white; }
        .hero-btn { display: inline-block; padding: 10px 24px; background: ${accentColor}; color: ${primaryColor}; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 13px; }
        .section { padding: 32px 24px; }
        .section-title { font-size: 18px; font-weight: 700; color: ${primaryColor}; margin-bottom: 16px; text-align: center; }
        .services-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .service-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 12px; text-align: center; }
        .gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .gallery-img { width: 100%; aspect-ratio: 4/3; background: #e5e7eb; border-radius: 8px; object-fit: cover; }
        .contact-form { background: #f9fafb; padding: 24px; border-radius: 12px; }
        .contact-input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 8px; font-size: 12px; }
        .contact-btn { width: 100%; padding: 10px; background: ${accentColor}; color: ${primaryColor}; border: none; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; }
        .about { background: #f9fafb; }
        .reviews { background: ${bgColor}; }
        .review-card { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; }
        .stars { color: ${accentColor}; font-size: 14px; }
        .nav { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: ${primaryColor}; }
        .nav-brand { color: white; font-weight: 700; font-size: 14px; }
        .nav-phone { color: ${accentColor}; font-size: 12px; font-weight: 600; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="nav">
        <span class="nav-brand">${businessName || 'Your Business'}</span>
        ${phone ? `<a href="tel:${phone}" class="nav-phone">${phone}</a>` : ''}
      </div>
      ${enabledSections.includes('hero') ? `
      <div class="hero hero-bg" style="${heroImage?.url ? `background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url('${heroImage.url}') center/cover;` : ''}">
        <h1>${businessName || 'Your Business Name'}</h1>
        <p>${tagline || 'Professional service you can trust'}</p>
        <a href="#contact" class="hero-btn">Get a Free Estimate</a>
      </div>
      ` : ''}
      ${enabledSections.includes('services') && services.length > 0 ? `
      <div class="section">
        <div class="section-title">Our Services</div>
        <div class="services-grid">
          ${services.slice(0, 6).map((s) => `<div class="service-card">${s}</div>`).join('')}
        </div>
      </div>
      ` : ''}
      ${enabledSections.includes('gallery') ? `
      <div class="section">
        <div class="section-title">Our Work</div>
        <div class="gallery-grid">
          ${[1, 2, 3, 4].map(() => '<div class="gallery-img"></div>').join('')}
        </div>
      </div>
      ` : ''}
      ${enabledSections.includes('reviews') ? `
      <div class="section reviews">
        <div class="section-title">What Our Customers Say</div>
        <div class="review-card">
          <div class="stars">★★★★★</div>
          <p style="font-size: 12px; margin-top: 8px;">"Great work and very professional. Highly recommend!"</p>
          <p style="font-size: 11px; color: #6b7280; margin-top: 4px;">— Happy Customer</p>
        </div>
      </div>
      ` : ''}
      ${enabledSections.includes('about') ? `
      <div class="section about">
        <div class="section-title">About Us</div>
        <p style="font-size: 13px; text-align: center; color: #4b5563;">With years of experience serving the local community, we take pride in delivering quality work on every project.</p>
      </div>
      ` : ''}
      ${enabledSections.includes('contact') ? `
      <div class="section" id="contact">
        <div class="section-title">Get In Touch</div>
        <div class="contact-form">
          <input class="contact-input" placeholder="Your Name" disabled />
          <input class="contact-input" placeholder="Phone Number" disabled />
          <input class="contact-input" placeholder="Email" disabled />
          <textarea class="contact-input" placeholder="Tell us about your project..." rows="3" disabled style="resize: none;"></textarea>
          <button class="contact-btn" disabled>Send Message</button>
        </div>
      </div>
      ` : ''}
    </body>
    </html>
  `;

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
          srcDoc={previewHtml}
          className={`border-0 bg-white transition-all duration-300 ${
            viewMode === 'mobile' ? 'w-[375px]' : 'w-full'
          } ${fullscreen ? 'h-full' : 'min-h-[400px]'}`}
          title="Website Preview"
          sandbox="allow-same-origin"
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
