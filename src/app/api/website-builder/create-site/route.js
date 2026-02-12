import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { registerDomain, setDNSRecords } from '@/lib/namecom';
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

function generateSlug(businessName) {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 60);
}

export async function POST(request) {
  try {
    const supabase = getSupabase();

    // Parse body FIRST — the token may be in the body as a fallback when
    // the Authorization header is stripped by 308 redirects (trailingSlash + Netlify)
    const body = await request.json();

    // Auth check — tries header, body, query, cookie; verifies via Supabase getUser()
    const { user, error: authResponse } = await authenticateRequest(request, body?._authToken);
    if (authResponse) return authResponse;

    // Get user profile for company_id
    const { data: dbUser } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!dbUser?.company_id) {
      return NextResponse.json({ error: 'No company found for user' }, { status: 400 });
    }

    const {
      trade, templateId, businessName, tagline, phone, email,
      serviceArea, services, licenseNumber, yearsInBusiness,
      selectedDomain, colors, enabledSections, heroImage, galleryImages,
    } = body;

    // Validation
    if (!businessName || !phone || !services?.length) {
      return NextResponse.json({ error: 'Missing required fields: businessName, phone, services' }, { status: 400 });
    }
    if (!selectedDomain?.domainName) {
      return NextResponse.json({ error: 'Domain selection is required' }, { status: 400 });
    }

    // Check for existing site
    const { data: existingSite } = await supabase
      .from('website_sites')
      .select('id, status, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    let site;

    if (existingSite && existingSite.status === 'live') {
      return NextResponse.json({ error: 'You already have a website. Edit it from your dashboard.' }, { status: 409 });
    }

    if (existingSite) {
      // Site exists but is stuck in building/draft/error — update it with new data
      const { data: updatedSite, error: updateError } = await supabase
        .from('website_sites')
        .update({
          template_id: templateId || null,
          business_name: businessName,
          business_phone: phone,
          business_email: email || user.email,
          business_address: serviceArea || '',
          site_content: {
            trade,
            tagline: tagline || '',
            serviceArea: serviceArea || '',
            services: services || [],
            licenseNumber: licenseNumber || '',
            yearsInBusiness: yearsInBusiness || '',
            colors: colors || {},
            enabledSections: enabledSections || [],
            heroImage: heroImage || null,
            galleryImages: galleryImages || [],
          },
          status: 'building',
          custom_domain: selectedDomain.domainName,
          domain_status: 'pending',
          wizard_step: 6,
          wizard_completed: true,
        })
        .eq('id', existingSite.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[Create Site] DB update error:', updateError);
        return NextResponse.json({ error: 'Failed to update site record' }, { status: 500 });
      }
      site = updatedSite;
    } else {
      // No existing site — create a new one
      // Add random suffix to slug and domain to prevent collisions
      const randomSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const slug = generateSlug(businessName) + '-' + randomSuffix;

      // De-duplicate subdomain names by appending the same suffix
      let domainToStore = selectedDomain.domainName;
      if (selectedDomain.type === 'subdomain' && domainToStore.endsWith('.tooltimepro.com')) {
        const subPart = domainToStore.replace('.tooltimepro.com', '');
        domainToStore = `${subPart}-${randomSuffix}.tooltimepro.com`;
      }

      const { data: newSite, error: insertError } = await supabase
        .from('website_sites')
        .insert({
          company_id: dbUser.company_id,
          user_id: user.id,
          template_id: templateId || null,
          slug,
          business_name: businessName,
          business_phone: phone,
          business_email: email || user.email,
          business_address: serviceArea || '',
          site_content: {
            trade,
            tagline: tagline || '',
            serviceArea: serviceArea || '',
            services: services || [],
            licenseNumber: licenseNumber || '',
            yearsInBusiness: yearsInBusiness || '',
            colors: colors || {},
            enabledSections: enabledSections || [],
            heroImage: heroImage || null,
            galleryImages: galleryImages || [],
          },
          status: 'building',
          custom_domain: domainToStore,
          domain_status: 'pending',
          wizard_step: 6,
          wizard_completed: true,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[Create Site] DB insert error:', insertError);
        return NextResponse.json({ error: `Failed to create site record: ${insertError.message}` }, { status: 500 });
      }
      site = newSite;
    }

    const cleanDomain = selectedDomain.domainName.toLowerCase().trim();
    const domainType = selectedDomain.type || 'new'; // 'new' | 'existing' | 'subdomain'

    // Only register via Name.com for brand-new domain purchases
    if (domainType === 'new') {
      await logDomainAction(supabase, site.id, user.id, dbUser.company_id, cleanDomain, 'register', 'pending');

      const { data: company } = await supabase
        .from('companies')
        .select('name, email, phone, address, city, state, zip')
        .eq('id', dbUser.company_id)
        .single();

      const contacts = {
        firstName: user.user_metadata?.first_name || 'ToolTime',
        lastName: user.user_metadata?.last_name || 'Pro Customer',
        companyName: company?.name || businessName,
        address1: company?.address || '',
        city: company?.city || '',
        state: company?.state || 'CA',
        zip: company?.zip || '',
        phone: company?.phone || phone,
        email: user.email || company?.email || email,
      };

      try {
        const regResult = await registerDomain(cleanDomain, contacts);

        if (regResult.success) {
          await logDomainAction(supabase, site.id, user.id, dbUser.company_id, cleanDomain, 'register', 'success', {
            expireDate: regResult.expireDate,
          });

          try {
            const dnsResult = await setDNSRecords(cleanDomain);
            await logDomainAction(supabase, site.id, user.id, dbUser.company_id, cleanDomain, 'dns_update',
              dnsResult.success ? 'success' : 'failed', { records: dnsResult.records });

            await supabase
              .from('website_sites')
              .update({
                domain_status: dnsResult.success ? 'active' : 'pending',
                domain_registered_at: new Date().toISOString(),
                domain_expires_at: regResult.expireDate || null,
                domain_auto_renew: true,
              })
              .eq('id', site.id);
          } catch (dnsError) {
            console.error('[Create Site] DNS error:', dnsError.message);
            await logDomainAction(supabase, site.id, user.id, dbUser.company_id, cleanDomain, 'dns_update', 'failed', null, { error: dnsError.message });
          }
        } else {
          await logDomainAction(supabase, site.id, user.id, dbUser.company_id, cleanDomain, 'register', 'failed', null, { error: regResult.error });
        }
      } catch (domainError) {
        console.error('[Create Site] Domain registration error:', domainError.message);
        await logDomainAction(supabase, site.id, user.id, dbUser.company_id, cleanDomain, 'register', 'failed', null, { error: domainError.message });
      }
    } else {
      // Subdomain or existing domain — no Name.com registration needed
      await supabase
        .from('website_sites')
        .update({
          domain_status: domainType === 'subdomain' ? 'active' : 'pending',
        })
        .eq('id', site.id);

      await logDomainAction(supabase, site.id, user.id, dbUser.company_id, cleanDomain,
        domainType === 'subdomain' ? 'subdomain_setup' : 'existing_domain',
        'success', { type: domainType });
    }

    // Set site live immediately — no async build step yet.
    // (When a real build pipeline exists, this will be replaced by a webhook/job.)
    await supabase
      .from('website_sites')
      .update({ status: 'live', published_at: new Date().toISOString() })
      .eq('id', site.id);

    return NextResponse.json({
      success: true,
      siteId: site.id,
      status: 'live',
      domain: cleanDomain,
      message: 'Your website is live!',
    });
  } catch (error) {
    console.error('[Create Site API] Error:', error);
    // Surface the real reason instead of a generic message
    const msg = error?.message || 'Unknown error';
    if (msg.includes('environment variables')) {
      return NextResponse.json({ error: 'Server configuration error. Please contact support. (env)' }, { status: 500 });
    }
    return NextResponse.json({ error: `Site creation failed: ${msg}` }, { status: 500 });
  }
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
