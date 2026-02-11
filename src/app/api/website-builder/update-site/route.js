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

export async function PUT(request) {
  try {
    const supabase = getSupabase();

    // Auth check — decode JWT directly, no network call to Supabase
    const { user, error: authResponse } = authenticateRequest(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { siteId, ...updates } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: site, error: siteError } = await supabase
      .from('website_sites')
      .select('id, site_content')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 });
    }

    // Build update object
    const siteUpdate = {};
    const contentUpdate = { ...(site.site_content || {}) };

    // Direct column updates
    if (updates.businessName) siteUpdate.business_name = updates.businessName;
    if (updates.phone) siteUpdate.business_phone = updates.phone;
    if (updates.email) siteUpdate.business_email = updates.email;

    // Content updates (merged into site_content JSONB)
    const contentFields = ['tagline', 'serviceArea', 'services', 'licenseNumber', 'yearsInBusiness', 'colors', 'enabledSections', 'heroImage', 'galleryImages'];
    for (const field of contentFields) {
      if (updates[field] !== undefined) {
        contentUpdate[field] = updates[field];
      }
    }

    siteUpdate.site_content = contentUpdate;

    const { error: updateError } = await supabase
      .from('website_sites')
      .update(siteUpdate)
      .eq('id', siteId);

    if (updateError) {
      console.error('[Update Site] DB error:', updateError);
      return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      siteId,
      message: 'Site updated successfully.',
    });
  } catch (error) {
    console.error('[Update Site API] Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
