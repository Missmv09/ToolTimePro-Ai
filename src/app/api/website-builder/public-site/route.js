import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request) {
  try {
    const supabase = getSupabase();

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'slug parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch site with template data — no auth required (public view)
    const { data: site, error: siteError } = await supabase
      .from('website_sites')
      .select(`
        id, slug, business_name, business_phone, business_email,
        site_content, status, custom_domain, published_at,
        website_templates (
          id, slug, name, trade_category, style,
          primary_color, secondary_color, accent_color,
          font_heading, font_body, layout_config, default_content
        )
      `)
      .eq('slug', slug)
      .eq('status', 'live')
      .maybeSingle();

    if (siteError) {
      console.error('[Public Site] DB error:', siteError);
      return NextResponse.json(
        { error: 'Failed to fetch site' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const template = site.website_templates || null;
    const { website_templates: _, ...siteData } = site;

    return NextResponse.json(
      { site: siteData, template },
      {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[Public Site API] Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500, headers: corsHeaders }
    );
  }
}
