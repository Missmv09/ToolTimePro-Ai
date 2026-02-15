import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Auth check — verifies via Supabase getUser(), falls back to local JWT
    const { user, error: authResponse } = await authenticateRequest(request);
    if (authResponse) return authResponse;

    // Fetch site
    const { data: site, error: siteError } = await supabase
      .from('website_sites')
      .select('id, status, custom_domain, domain_status, published_at, slug')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Fetch recent domain logs
    const { data: logs } = await supabase
      .from('website_domain_log')
      .select('action, status')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(10);

    const domainRegistered = logs?.some((l) => l.action === 'register' && l.status === 'success') || false;
    const dnsConfigured = logs?.some((l) => l.action === 'dns_update' && l.status === 'success') || false;
    // Subdomain/existing domain setups count as "registered" (no Name.com step needed)
    const subdomainOrExisting = logs?.some((l) =>
      (l.action === 'subdomain_setup' || l.action === 'existing_domain') && l.status === 'success'
    ) || false;
    const isLive = site.status === 'live';
    const isBuilding = site.status === 'building';
    const domainReady = domainRegistered || subdomainOrExisting;

    // Derive build steps
    const steps = {
      domain_registered: domainReady,
      dns_configured: dnsConfigured || subdomainOrExisting,
      site_generated: isLive || (isBuilding && domainReady),
      deployed: isLive,
      live: isLive,
    };

    // Build the public-facing URL for the site
    const hasRealDomain = site.custom_domain && !site.custom_domain.endsWith('.tooltimepro.com');
    const siteUrl = isLive
      ? (hasRealDomain ? `https://${site.custom_domain}` : (site.slug ? `https://tooltimepro.com/site/${site.slug}` : null))
      : null;

    return NextResponse.json({
      siteId: site.id,
      status: site.status,
      domain: site.custom_domain,
      steps,
      siteUrl,
      error: site.status === 'error' ? 'Site deployment failed. Please contact support.' : null,
    });
  } catch (error) {
    console.error('[Publish Status API] Error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
