import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';
import { mapDbError } from '@/lib/api-errors';

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

function generateBaseSlug(businessName) {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

/**
 * Generate a unique slug by checking the database for collisions.
 * First tries the clean slug (e.g. "saldana-sons"), then appends
 * an incrementing number if taken (e.g. "saldana-sons-2", "saldana-sons-3").
 */
async function generateUniqueSlug(supabase, businessName) {
  const baseSlug = generateBaseSlug(businessName);

  // Check if the base slug is available
  const { data: existing } = await supabase
    .from('website_sites')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle();

  if (!existing) return baseSlug;

  // Find all slugs that start with this base to determine the next number
  const { data: similar } = await supabase
    .from('website_sites')
    .select('slug')
    .like('slug', `${baseSlug}-%`);

  // Extract numeric suffixes from existing slugs like "saldana-sons-2", "saldana-sons-3"
  let maxNum = 1;
  if (similar?.length) {
    for (const row of similar) {
      const suffix = row.slug.replace(`${baseSlug}-`, '');
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  return `${baseSlug}-${maxNum + 1}`;
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
      fontHeading, fontBody, ctaText,
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
            fontHeading: fontHeading || 'Inter',
            fontBody: fontBody || 'Inter',
            ctaText: ctaText || '',
          },
          status: 'building',
          custom_domain: selectedDomain.domainName,
          domain_status: 'pending',
          wizard_step: 6,
          wizard_completed: true,
        })
        .eq('id', existingSite.id)
        .select('id, slug')
        .single();

      if (updateError) {
        const mapped = mapDbError(updateError, { route: 'create-site', op: 'update', siteId: existingSite.id, userId: user.id });
        return NextResponse.json({ error: mapped.customer, code: mapped.code }, { status: mapped.httpStatus });
      }
      site = updatedSite;
    } else {
      // No existing site — create a new one
      // Generate a clean, unique slug (e.g. "saldana-sons" or "saldana-sons-2")
      const slug = await generateUniqueSlug(supabase, businessName);

      // For subdomains, use the slug directly as the subdomain (clean name)
      let domainToStore = selectedDomain.domainName;
      if (selectedDomain.type === 'subdomain' && domainToStore.endsWith('.taskiguana.com')) {
        domainToStore = `${slug}.taskiguana.com`;
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
            fontHeading: fontHeading || 'Inter',
            fontBody: fontBody || 'Inter',
            ctaText: ctaText || '',
          },
          status: 'building',
          custom_domain: domainToStore,
          domain_status: 'pending',
          wizard_step: 6,
          wizard_completed: true,
        })
        .select('id, slug')
        .single();

      if (insertError) {
        const mapped = mapDbError(insertError, { route: 'create-site', op: 'insert', userId: user.id, companyId: dbUser.company_id });
        return NextResponse.json({ error: mapped.customer, code: mapped.code }, { status: mapped.httpStatus });
      }
      site = newSite;
    }

    const cleanDomain = selectedDomain.domainName.toLowerCase().trim();
    // 'new' is a legacy value from before we removed in-app domain registration.
    // Any 'new' selection coming in from a stale client is treated as a BYO
    // ("existing") domain — the customer registers it themselves at their
    // registrar of choice and then connects it via DNS.
    const rawType = selectedDomain.type || 'subdomain';
    const domainType = rawType === 'new' ? 'existing' : rawType;

    await supabase
      .from('website_sites')
      .update({ domain_status: domainType === 'subdomain' ? 'active' : 'pending' })
      .eq('id', site.id);

    await logDomainAction(supabase, site.id, user.id, dbUser.company_id, cleanDomain,
      domainType === 'subdomain' ? 'subdomain_setup' : 'existing_domain',
      domainType === 'subdomain' ? 'success' : 'pending',
      { type: domainType });

    // Set site live immediately — no async build step yet.
    // (When a real build pipeline exists, this will be replaced by a webhook/job.)
    await supabase
      .from('website_sites')
      .update({ status: 'live', published_at: new Date().toISOString() })
      .eq('id', site.id);

    // Build the public-facing URL for the site
    const isSubdomain = (selectedDomain.type || 'new') === 'subdomain' || cleanDomain.endsWith('.taskiguana.com');
    const siteUrl = isSubdomain
      ? `/site/${site.slug}/`
      : `https://${cleanDomain}`;

    return NextResponse.json({
      success: true,
      siteId: site.id,
      slug: site.slug,
      status: 'live',
      domain: cleanDomain,
      siteUrl,
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
