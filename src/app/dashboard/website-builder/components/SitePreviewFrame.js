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
  } = wizardData;

  const primaryColor = colors.primary || '#1a1a2e';
  const accentColor = colors.accent || '#f5a623';
  const bgColor = colors.background || '#ffffff';

  // Derive a secondary color (slightly lighter shade) matching PublicSiteRenderer logic
  const secondaryColor = '#16213e';

  const previewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; color: #333; background: ${bgColor}; }

        /* Navigation */
        .nav { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: ${primaryColor}; position: sticky; top: 0; z-index: 100; }
        .nav-brand { color: #fff; font-weight: 700; font-size: 18px; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-phone { color: ${accentColor}; font-size: 14px; font-weight: 600; text-decoration: none; }
        .nav-cta { background: ${accentColor}; color: ${primaryColor}; padding: 8px 20px; border-radius: 6px; font-weight: 700; font-size: 13px; text-decoration: none; }

        /* Hero */
        .hero { padding: 80px 24px; text-align: center; color: #fff; position: relative; min-height: 420px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .hero-bg { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); }
        .hero h1 { font-size: clamp(28px, 5vw, 48px); font-weight: 800; margin-bottom: 16px; color: #fff; line-height: 1.2; max-width: 800px; }
        .hero p.tagline { font-size: clamp(16px, 2.5vw, 22px); opacity: 0.92; margin-bottom: 32px; color: #fff; max-width: 600px; line-height: 1.5; }
        .hero-btn { display: inline-block; padding: 14px 36px; background: ${accentColor}; color: ${primaryColor}; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 16px; }
        .hero .service-area { margin-top: 20px; font-size: 14px; opacity: 0.8; }

        /* Sections */
        .section { padding: 64px 24px; }
        .section-inner { max-width: 1000px; margin: 0 auto; }
        .section-title { font-size: 28px; font-weight: 700; color: ${primaryColor}; margin-bottom: 40px; text-align: center; }

        /* Services */
        .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .service-card { padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 15px; font-weight: 500; text-align: center; color: #374151; background: #fff; }

        /* Gallery */
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
        .gallery-item { border-radius: 12px; overflow: hidden; }
        .gallery-img { width: 100%; aspect-ratio: 4/3; background: #e5e7eb; border-radius: 12px; object-fit: cover; display: block; }

        /* About */
        .about { background: #f9fafb; }
        .about-inner { max-width: 700px; margin: 0 auto; text-align: center; }
        .about p { font-size: 16px; color: #4b5563; line-height: 1.7; }
        .about .license { margin-top: 16px; font-size: 13px; color: #6b7280; }

        /* Reviews */
        .reviews-grid { display: grid; gap: 16px; }
        .review-card { padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; }
        .stars { color: ${accentColor}; font-size: 18px; margin-bottom: 8px; }
        .review-text { font-size: 15px; color: #374151; line-height: 1.6; }
        .review-author { font-size: 13px; color: #6b7280; margin-top: 8px; }

        /* Contact */
        .contact-section { background: #f9fafb; }
        .contact-inner { max-width: 560px; margin: 0 auto; }
        .contact-form { display: flex; flex-direction: column; gap: 12px; }
        .contact-input { width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; background: #fff; box-sizing: border-box; outline: none; }
        .contact-btn { width: 100%; padding: 14px; background: ${accentColor}; color: ${primaryColor}; border: none; border-radius: 8px; font-weight: 700; font-size: 16px; cursor: pointer; }

        /* Footer */
        .footer { background: ${primaryColor}; color: #fff; padding: 32px 24px; text-align: center; }
        .footer-name { font-weight: 700; font-size: 16px; margin-bottom: 8px; }
        .footer-links { display: flex; justify-content: center; gap: 24px; font-size: 14px; opacity: 0.85; }
        .footer-links a { color: ${accentColor}; text-decoration: none; }
        .footer-copy { margin-top: 16px; font-size: 12px; opacity: 0.6; }
        .footer-powered { margin-top: 8px; font-size: 11px; opacity: 0.4; }
        .footer-powered a { color: ${accentColor}; text-decoration: none; }
      </style>
    </head>
    <body>
      <!-- Navigation -->
      <div class="nav">
        <span class="nav-brand">${businessName || 'Your Business'}</span>
        <div class="nav-right">
          ${phone ? `<a href="tel:${phone}" class="nav-phone">${phone}</a>` : ''}
          <a href="#contact" class="nav-cta">Contact Us</a>
        </div>
      </div>

      <!-- Hero -->
      ${enabledSections.includes('hero') ? `
      <div class="hero hero-bg" style="${heroImage?.url ? `background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('${heroImage.url}') center/cover no-repeat;` : ''}">
        <h1>${businessName || 'Your Business Name'}</h1>
        ${tagline ? `<p class="tagline">${tagline}</p>` : ''}
        <a href="#contact" class="hero-btn">Get a Free Estimate</a>
        ${serviceArea ? `<p class="service-area">Proudly serving ${serviceArea}</p>` : ''}
      </div>
      ` : ''}

      <!-- Services -->
      ${enabledSections.includes('services') && services.length > 0 ? `
      <div class="section">
        <div class="section-inner">
          <div class="section-title">Our Services</div>
          <div class="services-grid">
            ${services.map((s) => `<div class="service-card">${s}</div>`).join('')}
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Gallery -->
      ${enabledSections.includes('gallery') ? `
      <div class="section" style="background: #f9fafb;">
        <div class="section-inner">
          <div class="section-title">Our Work</div>
          <div class="gallery-grid">
            ${galleryImages.length > 0
              ? galleryImages.map((img, i) => `<div class="gallery-item"><img class="gallery-img" src="${img.url || img}" alt="${img.alt || 'Project ' + (i + 1)}" /></div>`).join('')
              : [1, 2, 3, 4].map(() => '<div class="gallery-item"><div class="gallery-img"></div></div>').join('')
            }
          </div>
        </div>
      </div>
      ` : ''}

      <!-- About -->
      ${enabledSections.includes('about') ? `
      <div class="section about">
        <div class="about-inner">
          <div class="section-title">About ${businessName || 'Us'}</div>
          <p>
            ${yearsInBusiness ? `With ${yearsInBusiness} years of experience, we` : 'We'}
            take pride in delivering quality ${trade || 'service'} work to our community.${serviceArea ? ` Serving ${serviceArea} and surrounding areas.` : ''}
            Our team is dedicated to providing professional, reliable results on every project.
          </p>
          ${licenseNumber ? `<p class="license">License #${licenseNumber}</p>` : ''}
        </div>
      </div>
      ` : ''}

      <!-- Reviews -->
      ${enabledSections.includes('reviews') ? `
      <div class="section">
        <div style="max-width: 800px; margin: 0 auto;">
          <div class="section-title">What Our Customers Say</div>
          <div class="reviews-grid">
            <div class="review-card">
              <div class="stars">\u2605\u2605\u2605\u2605\u2605</div>
              <p class="review-text">\u201cGreat work and very professional. Highly recommend!\u201d</p>
              <p class="review-author">\u2014 Happy Customer</p>
            </div>
            <div class="review-card">
              <div class="stars">\u2605\u2605\u2605\u2605\u2605</div>
              <p class="review-text">\u201cOn time, on budget, and the quality exceeded our expectations.\u201d</p>
              <p class="review-author">\u2014 Satisfied Client</p>
            </div>
            <div class="review-card">
              <div class="stars">\u2605\u2605\u2605\u2605\u2605</div>
              <p class="review-text">\u201cWe\u2019ve used them for years \u2014 always dependable and fair pricing.\u201d</p>
              <p class="review-author">\u2014 Loyal Customer</p>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Contact -->
      ${enabledSections.includes('contact') ? `
      <div class="section contact-section" id="contact">
        <div class="contact-inner">
          <div class="section-title">Get In Touch</div>
          <div class="contact-form">
            <input class="contact-input" placeholder="Your Name *" disabled />
            <input class="contact-input" placeholder="Phone Number" disabled />
            <input class="contact-input" placeholder="Email Address" disabled />
            <input class="contact-input" placeholder="Service Needed" disabled />
            <textarea class="contact-input" placeholder="Tell us about your project..." rows="4" disabled style="resize: vertical;"></textarea>
            <button class="contact-btn" disabled>Send Message</button>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Footer -->
      <div class="footer">
        <p class="footer-name">${businessName || 'Your Business'}</p>
        <div class="footer-links">
          ${phone ? `<a href="tel:${phone}">${phone}</a>` : ''}
          ${email ? `<a href="mailto:${email}">${email}</a>` : ''}
        </div>
        <p class="footer-copy">&copy; ${new Date().getFullYear()} ${businessName || 'Your Business'}. All rights reserved.</p>
        <p class="footer-powered">Powered by <a href="https://tooltimepro.com">ToolTime Pro</a></p>
      </div>
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
