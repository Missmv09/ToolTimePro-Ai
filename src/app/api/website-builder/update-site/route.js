import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { authenticateRequest } from '@/lib/server-auth';
import { PLAN_PAGE_LIMITS } from '@/lib/plan-features';

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

export async function PUT(request) {
  try {
    const supabase = getSupabase();

    const body = await request.json();

    // Auth check — tries header, then body._authToken, then query param
    const { user, error: authResponse } = await authenticateRequest(request, body?._authToken);
    if (authResponse) return authResponse;

    const { siteId, _authToken, ...updates } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: site, error: siteError } = await supabase
      .from('website_sites')
      .select('id, slug, site_content')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 });
    }

    // Enforce section/page limit based on plan
    if (updates.enabledSections) {
      const { data: dbUser } = await supabase.from('users').select('company_id').eq('id', user.id).single();
      if (dbUser?.company_id) {
        const { data: company } = await supabase.from('companies').select('plan, addons, is_beta_tester').eq('id', dbUser.company_id).single();
        if (company && !company.is_beta_tester) {
          const plan = company.plan || 'starter';
          const baseLimit = PLAN_PAGE_LIMITS[plan] || 1;
          const extraPages = (company.addons || []).filter(a => a === 'extra_page').length;
          const maxSections = baseLimit + extraPages;
          if (updates.enabledSections.length > maxSections) {
            return NextResponse.json(
              { error: `Your ${plan} plan allows ${maxSections} section(s). Upgrade your plan or add Extra Pages.` },
              { status: 403 }
            );
          }
        }
      }
    }

    // Build update object
    const siteUpdate = {};
    const contentUpdate = { ...(site.site_content || {}) };

    // Direct column updates
    if (updates.businessName !== undefined) siteUpdate.business_name = updates.businessName;
    if (updates.phone !== undefined) siteUpdate.business_phone = updates.phone;
    if (updates.email !== undefined) siteUpdate.business_email = updates.email;

    // Content updates (merged into site_content JSONB)
    const contentFields = ['tagline', 'serviceArea', 'services', 'licenseNumber', 'yearsInBusiness', 'colors', 'enabledSections', 'heroImage', 'galleryImages', 'fontHeading', 'fontBody', 'ctaText'];
    for (const field of contentFields) {
      if (updates[field] !== undefined) {
        contentUpdate[field] = updates[field];
      }
    }

    siteUpdate.site_content = contentUpdate;

    const { data: updatedRows, error: updateError } = await supabase
      .from('website_sites')
      .update(siteUpdate)
      .eq('id', siteId)
      .select('id, slug');

    if (updateError) {
      console.error('[Update Site] DB error:', updateError);
      return NextResponse.json({ error: `Failed to update site: ${updateError.message}` }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.error('[Update Site] No rows updated for siteId:', siteId);
      return NextResponse.json({ error: 'Update did not apply. Please try again.' }, { status: 500 });
    }

    // Bust Next.js cache so the live site reflects changes immediately
    if (site.slug) {
      revalidatePath(`/site/${site.slug}`);
    }

    return NextResponse.json({
      success: true,
      siteId,
      slug: site.slug,
      message: 'Site updated successfully.',
    });
  } catch (error) {
    console.error('[Update Site API] Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
