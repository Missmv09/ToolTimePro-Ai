import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import PublicSiteContact from './PublicSiteContact';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getSite(slug) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('website_sites')
    .select(`
      *,
      website_templates (
        id, slug, name, trade_category, style,
        primary_color, secondary_color, accent_color,
        font_heading, font_body, layout_config, default_content
      )
    `)
    .eq('slug', slug)
    .eq('status', 'live')
    .maybeSingle();

  if (error) {
    console.error('[Public Site] DB error:', error);
    return null;
  }
  return data;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return { title: 'Site Not Found' };

  const content = site.site_content || {};
  return {
    title: `${site.business_name} — ${content.tagline || 'Professional Services'}`,
    description: content.tagline
      ? `${site.business_name}: ${content.tagline}. Call ${site.business_phone || 'us'} today!`
      : `${site.business_name} — professional ${content.trade || 'service'} provider. Contact us for a free estimate.`,
  };
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function PublicSitePage({ params }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) notFound();

  const template = site.website_templates || {};
  const content = site.site_content || {};
  const layout = template.layout_config || {};
  const defaultContent = template.default_content || {};

  const primaryColor = content.colors?.primary || template.primary_color || '#1a1a2e';
  const secondaryColor = template.secondary_color || '#1e40af';
  const accentColor = content.colors?.accent || template.accent_color || '#f5a623';
  const bgColor = content.colors?.background || '#ffffff';

  const fontHeading = template.font_heading || 'Inter';
  const fontBody = template.font_body || 'Inter';
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontHeading)}:wght@400;700;800&family=${encodeURIComponent(fontBody)}:wght@400;500;600&display=swap`;

  const businessName = site.business_name || 'Our Business';
  const tagline = content.tagline || defaultContent.heroSubtitle || 'Professional service you can trust';
  const phone = site.business_phone || '';
  const email = site.business_email || '';
  const services = content.services?.length ? content.services : (defaultContent.services || []);
  const ctaText = defaultContent.ctaText || 'Get a Free Estimate';
  const heroImage = content.heroImage || null;
  const galleryImages = content.galleryImages || [];
  const enabledSections = content.enabledSections?.length
    ? content.enabledSections
    : (layout.sections || ['hero', 'services', 'contact']);

  const yearsInBusiness = content.yearsInBusiness || '';
  const serviceArea = content.serviceArea || site.business_address || '';
  const licenseNumber = content.licenseNumber || '';

  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={fontUrl} />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: `${fontBody}, sans-serif`, color: '#333', background: bgColor }}>
        {/* Navigation */}
        <nav style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', background: primaryColor, position: 'sticky', top: 0, zIndex: 100,
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: `${fontHeading}, sans-serif` }}>
            {esc(businessName)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {phone && (
              <a href={`tel:${phone}`} style={{ color: accentColor, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                {esc(phone)}
              </a>
            )}
            <a
              href="#contact"
              style={{
                display: 'inline-block', padding: '8px 20px', background: accentColor, color: primaryColor,
                fontWeight: 700, borderRadius: 8, textDecoration: 'none', fontSize: 13,
              }}
            >
              {esc(ctaText)}
            </a>
          </div>
        </nav>

        {/* Hero */}
        {enabledSections.includes('hero') && (
          <section style={{
            padding: '80px 24px', textAlign: 'center', color: '#fff', position: 'relative',
            background: heroImage?.url
              ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('${esc(heroImage.url)}') center/cover no-repeat`
              : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            fontFamily: `${fontHeading}, sans-serif`,
          }}>
            <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 12 }}>
              {esc(businessName)}
            </h1>
            <p style={{ fontSize: 20, opacity: 0.9, marginBottom: 32, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
              {esc(tagline)}
            </p>
            <a
              href="#contact"
              style={{
                display: 'inline-block', padding: '14px 36px', background: accentColor, color: primaryColor,
                fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 16,
              }}
            >
              {esc(ctaText)}
            </a>
            {(yearsInBusiness || licenseNumber) && (
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 32, opacity: 0.85, fontSize: 14 }}>
                {yearsInBusiness && <span>{esc(yearsInBusiness)}+ Years Experience</span>}
                {licenseNumber && <span>License #{esc(licenseNumber)}</span>}
              </div>
            )}
          </section>
        )}

        {/* Services */}
        {enabledSections.includes('services') && services.length > 0 && (
          <section style={{ padding: '64px 24px', maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', color: primaryColor, marginBottom: 40, fontFamily: `${fontHeading}, sans-serif` }}>
              Our Services
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {services.map((service, i) => (
                <div
                  key={i}
                  style={{
                    padding: '20px 16px', border: '1px solid #e5e7eb', borderRadius: 12,
                    textAlign: 'center', fontSize: 15, fontWeight: 500, color: '#374151',
                    background: '#fff',
                  }}
                >
                  {esc(service)}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {enabledSections.includes('gallery') && galleryImages.length > 0 && (
          <section style={{ padding: '64px 24px', background: '#f9fafb' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', color: primaryColor, marginBottom: 40, fontFamily: `${fontHeading}, sans-serif` }}>
              Our Work
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, maxWidth: 1000, marginLeft: 'auto', marginRight: 'auto' }}>
              {galleryImages.map((img, i) => (
                <img
                  key={i}
                  src={img.url || img}
                  alt={`Work sample ${i + 1}`}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12, background: '#e5e7eb' }}
                />
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {enabledSections.includes('about') && (
          <section style={{ padding: '64px 24px', background: '#f9fafb' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', color: primaryColor, marginBottom: 24, fontFamily: `${fontHeading}, sans-serif` }}>
              About {esc(businessName)}
            </h2>
            <div style={{ maxWidth: 700, marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', fontSize: 16, lineHeight: 1.7, color: '#4b5563' }}>
              {yearsInBusiness && (
                <p style={{ marginBottom: 12 }}>
                  With over {esc(yearsInBusiness)} years of experience, we take pride in delivering quality work on every project.
                </p>
              )}
              {serviceArea && (
                <p style={{ marginBottom: 12 }}>Proudly serving {esc(serviceArea)} and surrounding areas.</p>
              )}
              {licenseNumber && (
                <p style={{ fontSize: 14, color: '#6b7280' }}>Licensed &amp; Insured — #{esc(licenseNumber)}</p>
              )}
              {!yearsInBusiness && !serviceArea && (
                <p>We are a trusted local business committed to providing excellent service to our community.</p>
              )}
            </div>
          </section>
        )}

        {/* Reviews */}
        {enabledSections.includes('reviews') && (
          <section style={{ padding: '64px 24px' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', color: primaryColor, marginBottom: 40, fontFamily: `${fontHeading}, sans-serif` }}>
              What Our Customers Say
            </h2>
            <div style={{ maxWidth: 700, marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { text: 'Great work and very professional. Highly recommend!', author: 'Happy Customer' },
                { text: 'On time, fair pricing, and the results were amazing.', author: 'Satisfied Client' },
              ].map((review, i) => (
                <div key={i} style={{ padding: 24, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
                  <div style={{ color: accentColor, fontSize: 18, marginBottom: 8 }}>&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                  <p style={{ fontSize: 15, color: '#374151', marginBottom: 8 }}>&ldquo;{review.text}&rdquo;</p>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>&mdash; {review.author}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact Form */}
        {enabledSections.includes('contact') && (
          <section id="contact" style={{ padding: '64px 24px', background: '#f9fafb' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', color: primaryColor, marginBottom: 12, fontFamily: `${fontHeading}, sans-serif` }}>
              Get In Touch
            </h2>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 32, fontSize: 15 }}>
              Ready to get started? Send us a message and we&apos;ll get back to you right away.
            </p>
            <PublicSiteContact
              siteId={site.id}
              primaryColor={primaryColor}
              accentColor={accentColor}
              services={services}
            />
          </section>
        )}

        {/* Footer */}
        <footer style={{
          padding: '32px 24px', background: primaryColor, color: '#fff', textAlign: 'center',
          fontSize: 13, opacity: 0.9,
        }}>
          <p style={{ marginBottom: 8, fontWeight: 600, fontFamily: `${fontHeading}, sans-serif` }}>
            {esc(businessName)}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12, fontSize: 13 }}>
            {phone && <a href={`tel:${phone}`} style={{ color: accentColor, textDecoration: 'none' }}>{esc(phone)}</a>}
            {email && <a href={`mailto:${email}`} style={{ color: accentColor, textDecoration: 'none' }}>{esc(email)}</a>}
          </div>
          {serviceArea && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Serving {esc(serviceArea)}</p>}
          <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
            &copy; {new Date().getFullYear()} {esc(businessName)}. Powered by ToolTime Pro.
          </p>
        </footer>
      </body>
    </html>
  );
}
