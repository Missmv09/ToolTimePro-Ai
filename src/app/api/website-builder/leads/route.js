import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();

    const { siteId, name, phone, email, message, service, source } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400, headers: corsHeaders });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400, headers: corsHeaders });
    }

    // Fetch site to get company_id
    const { data: site, error: siteError } = await supabase
      .from('website_sites')
      .select('id, company_id, user_id, business_name')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404, headers: corsHeaders });
    }

    // Insert into website_leads
    const { error: leadError } = await supabase
      .from('website_leads')
      .insert({
        site_id: site.id,
        company_id: site.company_id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        message: message?.trim() || null,
        service_requested: service?.trim() || null,
        source: source || 'website_contact_form',
        status: 'new',
      });

    if (leadError) {
      console.error('[Website Leads] Insert error:', leadError);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500, headers: corsHeaders });
    }

    // Also insert into main CRM leads table
    try {
      await supabase.from('leads').insert({
        company_id: site.company_id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        message: message?.trim() || null,
        service_requested: service?.trim() || null,
        source: 'website',
        status: 'new',
      });
    } catch (crmError) {
      console.error('[Website Leads] CRM insert error:', crmError.message);
      // Non-blocking — website lead was already saved
    }

    return NextResponse.json(
      { success: true, message: 'Thank you! We\'ll be in touch soon.' },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Website Leads API] Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
