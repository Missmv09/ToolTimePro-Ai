import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import PublicSiteRenderer from './PublicSiteRenderer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getSiteData(slug) {
  try {
    const supabase = getSupabase();

    const { data: site, error } = await supabase
      .from('website_sites')
      .select(`
        id, slug, business_name, business_phone, business_email,
        site_content, status, custom_domain, published_at,
        company_id,
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

    if (!site) return null;

    // Fetch company beta tester status
    let isBetaTester = false;
    if (site.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('is_beta_tester')
        .eq('id', site.company_id)
        .maybeSingle();
      isBetaTester = company?.is_beta_tester || false;
    }

    return { ...site, is_beta_tester: isBetaTester };
  } catch (err) {
    console.error('[Public Site] Failed to query site:', err);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const site = await getSiteData(slug);

  if (!site) {
    return { title: 'Site Not Found' };
  }

  const content = site.site_content || {};
  const template = site.website_templates || {};
  const description =
    content.tagline ||
    template.default_content?.heroSubtitle ||
    `Professional ${content.trade || 'service'} business`;

  return {
    title: site.business_name || 'Business Website',
    description,
    openGraph: {
      title: site.business_name,
      description,
      type: 'website',
    },
  };
}

export default async function PublicSitePage({ params }) {
  const { slug } = await params;
  const site = await getSiteData(slug);

  if (!site) {
    notFound();
  }

  const template = site.website_templates || {};
  const { website_templates: _, is_beta_tester: isBetaTester, ...siteData } = site;

  return <PublicSiteRenderer site={siteData} template={template} isBetaTester={isBetaTester} />;
}
