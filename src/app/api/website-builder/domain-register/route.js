import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { registerDomain, setDNSRecords } from '@/lib/namecom';
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

export async function POST(request) {
  try {
    const supabase = getSupabase();

    const body = await request.json();

    // Auth check — tries header, then body._authToken, then query param
    const { user, error: authResponse } = authenticateRequest(request, body?._authToken);
    if (authResponse) return authResponse;

    const { domainName, siteId } = body;
    if (!domainName || typeof domainName !== 'string') {
      return NextResponse.json({ error: 'Domain name is required' }, { status: 400 });
    }
    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    const cleanDomain = domainName.toLowerCase().trim();

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from('website_sites')
      .select('id, company_id, user_id, custom_domain, domain_status, wizard_step')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Website site not found or access denied' }, { status: 404 });
    }
    // Allow upgrading from a free subdomain to a custom domain
    const isSubdomain = site.custom_domain?.endsWith('.tooltimepro.com');
    if (site.domain_status === 'active' && site.custom_domain && !isSubdomain) {
      return NextResponse.json({ error: `Site already has domain: ${site.custom_domain}` }, { status: 409 });
    }

    // Get company info for contacts
    const { data: company } = await supabase
      .from('companies')
      .select('name, email, phone, address, city, state, zip')
      .eq('id', site.company_id)
      .single();

    const contacts = {
      firstName: user.user_metadata?.first_name || 'ToolTime',
      lastName: user.user_metadata?.last_name || 'Pro Customer',
      companyName: company?.name || '',
      address1: company?.address || '',
      city: company?.city || '',
      state: company?.state || 'CA',
      zip: company?.zip || '',
      phone: company?.phone || '',
      email: user.email || company?.email || '',
    };

    // Log attempt
    await logDomainAction(site.id, user.id, site.company_id, cleanDomain, 'register', 'pending');

    // Register domain
    const regResult = await registerDomain(cleanDomain, contacts);
    if (!regResult.success) {
      await logDomainAction(site.id, user.id, site.company_id, cleanDomain, 'register', 'failed', null, { error: regResult.error });
      return NextResponse.json({ error: `Domain registration failed: ${regResult.error}` }, { status: 500 });
    }

    // Set DNS records
    let dnsResult = { success: false };
    try {
      dnsResult = await setDNSRecords(cleanDomain);
      await logDomainAction(site.id, user.id, site.company_id, cleanDomain, 'dns_update',
        dnsResult.success ? 'success' : 'failed', { records: dnsResult.records });
    } catch (dnsError) {
      console.error('[Domain Register] DNS setup error:', dnsError.message);
    }

    // Update website_sites table
    await supabase
      .from('website_sites')
      .update({
        custom_domain: cleanDomain,
        domain_status: dnsResult.success ? 'active' : 'pending',
        domain_registered_at: new Date().toISOString(),
        domain_expires_at: regResult.expireDate || null,
        domain_auto_renew: true,
        wizard_step: Math.max(site.wizard_step || 1, 4),
      })
      .eq('id', siteId);

    await logDomainAction(site.id, user.id, site.company_id, cleanDomain, 'register', 'success', {
      expireDate: regResult.expireDate, dnsConfigured: dnsResult.success,
    });

    return NextResponse.json({
      success: true,
      domainName: cleanDomain,
      domainStatus: dnsResult.success ? 'active' : 'pending',
      expireDate: regResult.expireDate,
      autoRenew: true,
      dns: { configured: dnsResult.success, records: dnsResult.records || [], errors: dnsResult.errors || [] },
      message: dnsResult.success
        ? `${cleanDomain} registered and DNS configured! Your site will be live within minutes.`
        : `${cleanDomain} registered! DNS is still propagating — live within 24-48 hours.`,
    });
  } catch (error) {
    console.error('[Domain Register API] Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during domain registration.' }, { status: 500 });
  }
}

async function logDomainAction(siteId, userId, companyId, domainName, action, status, responseData = null, errorData = null) {
  try {
    await getSupabase().from('website_domain_log').insert({
      site_id: siteId, user_id: userId, company_id: companyId,
      domain_name: domainName, action, status,
      response_data: responseData,
      error_message: errorData ? JSON.stringify(errorData) : null,
    });
  } catch (logError) {
    console.error('[Domain Log] Failed to write log:', logError.message);
  }
}
