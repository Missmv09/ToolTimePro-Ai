import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';
import { normalizeDomain, isValidDomain, dnsRecordsFor } from '@/lib/site-dns';

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

async function logDomainAction(supabase, siteId, userId, companyId, domainName, action, status, responseData = null, errorData = null) {
  try {
    await supabase.from('website_domain_log').insert({
      site_id: siteId,
      user_id: userId,
      company_id: companyId,
      domain_name: domainName,
      action,
      status,
      response_data: responseData,
      error_message: errorData ? JSON.stringify(errorData) : null,
    });
  } catch (logError) {
    console.error('[Domain Log] Failed:', logError.message);
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { user, error: authResponse } = await authenticateRequest(request, body?._authToken);
    if (authResponse) return authResponse;

    const { siteId, domainName } = body;
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const clean = normalizeDomain(domainName);
    if (!isValidDomain(clean)) {
      return NextResponse.json({
        error: 'Please enter a valid domain (e.g. yourbusiness.com). Do not include http:// or www.',
      }, { status: 400 });
    }

    // Verify ownership and load company_id
    const { data: site, error: siteError } = await supabase
      .from('website_sites')
      .select('id, slug, company_id')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();
    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 });
    }

    // Prevent the same domain being claimed by two different sites.
    const { data: claimed } = await supabase
      .from('website_sites')
      .select('id')
      .eq('custom_domain', clean)
      .neq('id', site.id)
      .maybeSingle();
    if (claimed) {
      return NextResponse.json({
        error: 'That domain is already connected to another ToolTime Pro site. If this is your domain, contact support.',
      }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from('website_sites')
      .update({
        custom_domain: clean,
        domain_status: 'pending',
      })
      .eq('id', site.id);
    if (updateError) {
      console.error('[Connect Domain] DB error:', updateError);
      return NextResponse.json({ error: 'Failed to save domain. Please try again.' }, { status: 500 });
    }

    await logDomainAction(supabase, site.id, user.id, site.company_id, clean, 'existing_domain', 'pending', { source: 'connect-domain' });

    return NextResponse.json({
      success: true,
      domain: clean,
      dnsRecords: dnsRecordsFor(clean),
      message: 'Domain saved. Add the DNS records below at your registrar to go live.',
    });
  } catch (error) {
    console.error('[Connect Domain API] Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
