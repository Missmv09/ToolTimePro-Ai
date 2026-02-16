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

export async function DELETE(request) {
  try {
    const supabase = getSupabase();

    const { user, error: authResponse } = await authenticateRequest(request);
    if (authResponse) return authResponse;

    // Find the user's site
    const { data: site, error: fetchError } = await supabase
      .from('website_sites')
      .select('id, slug, custom_domain')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Delete Site] DB error:', fetchError);
      return NextResponse.json({ error: 'Failed to look up site' }, { status: 500 });
    }

    if (!site) {
      return NextResponse.json({ error: 'No website found to delete' }, { status: 404 });
    }

    // Delete related leads first (foreign key)
    await supabase
      .from('website_leads')
      .delete()
      .eq('site_id', site.id);

    // Delete domain logs
    await supabase
      .from('website_domain_log')
      .delete()
      .eq('site_id', site.id);

    // Delete the site
    const { error: deleteError } = await supabase
      .from('website_sites')
      .delete()
      .eq('id', site.id);

    if (deleteError) {
      console.error('[Delete Site] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Site deleted successfully. You can now create a new one.',
    });
  } catch (error) {
    console.error('[Delete Site API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
  }
}
