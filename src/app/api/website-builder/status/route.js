import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

// Lazy initialization for Supabase
let supabaseInstance = null;

function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseInstance;
}

export async function GET(request) {
  try {
    const supabase = getSupabase();

    // Auth check — decode JWT directly, no network call to Supabase
    const { user, error: authResponse } = await authenticateRequest(request);
    if (authResponse) return authResponse;

    // Fetch website site with template info
    const { data: site, error: siteError } = await supabase
      .from('website_sites')
      .select(`
        *,
        website_templates (
          id, slug, name, trade_category, style,
          primary_color, secondary_color, accent_color,
          font_heading, font_body, layout_config, default_content
        )
      `)
      .eq('user_id', user.id)
      .maybeSingle();

    if (siteError) {
      console.error('[Website Status] DB error:', siteError);
      return NextResponse.json({ error: 'Failed to fetch website status' }, { status: 500 });
    }

    // No site yet — return available templates for wizard
    if (!site) {
      const { data: templates } = await supabase
        .from('website_templates')
        .select('id, slug, name, description, trade_category, style, primary_color, secondary_color, thumbnail_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      return NextResponse.json({
        hasWebsite: false,
        site: null,
        template: null,
        availableTemplates: templates || [],
        wizardStep: 0,
        message: 'No website set up yet. Start the wizard to create your site!',
      });
    }

    // Site exists — get lead count and recent logs
    const { count: leadCount } = await supabase
      .from('website_leads')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', site.id);

    const { data: recentLogs } = await supabase
      .from('website_domain_log')
      .select('action, status, domain_name, created_at')
      .eq('site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const template = site.website_templates || null;
    const { website_templates: _, ...siteData } = site;

    return NextResponse.json({
      hasWebsite: true,
      site: {
        ...siteData,
        siteUrl: site.custom_domain && !site.custom_domain.endsWith('.tooltimepro.com')
          ? `https://${site.custom_domain}`
          : `https://tooltimepro.com/site/${site.slug}`,
        isPublished: site.status === 'live',
        hasDomain: site.domain_status === 'active' && !!site.custom_domain && !site.custom_domain.endsWith('.tooltimepro.com'),
      },
      template,
      stats: { leadCount: leadCount || 0 },
      recentDomainActivity: recentLogs || [],
      wizardStep: site.wizard_step || 1,
      wizardCompleted: site.wizard_completed || false,
    });
  } catch (error) {
    console.error('[Website Status API] Error:', error);
    return NextResponse.json({ error: 'Failed to get website status' }, { status: 500 });
  }
}
