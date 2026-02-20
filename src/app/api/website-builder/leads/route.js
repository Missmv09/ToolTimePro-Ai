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
      console.error('[Website Leads] Site lookup failed:', siteError?.message || 'Site not found', { siteId });
      return NextResponse.json({ error: 'Site not found' }, { status: 404, headers: corsHeaders });
    }

    // Build lead record — allow null company_id so the lead is still captured
    const leadRecord = {
      site_id: site.id,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      message: message?.trim() || null,
      service_requested: service?.trim() || null,
      source: source || 'website_contact_form',
      status: 'new',
    };

    // Only include company_id if it exists on the site
    if (site.company_id) {
      leadRecord.company_id = site.company_id;
    }

    // Insert into website_leads
    const { error: leadError } = await supabase
      .from('website_leads')
      .insert(leadRecord);

    if (leadError) {
      console.error('[Website Leads] Insert error:', {
        message: leadError.message,
        code: leadError.code,
        details: leadError.details,
        hint: leadError.hint,
        siteId: site.id,
        companyId: site.company_id,
      });
      return NextResponse.json(
        { error: 'Failed to save lead. Please try again or contact us directly.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Also insert into main CRM leads table (non-blocking)
    if (site.company_id) {
      const { error: crmError } = await supabase.from('leads').insert({
        company_id: site.company_id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        message: message?.trim() || null,
        service_requested: service?.trim() || null,
        source: 'website',
        status: 'new',
      });
      if (crmError) {
        console.error('[Website Leads] CRM insert error:', {
          message: crmError.message,
          code: crmError.code,
          details: crmError.details,
        });
        // Non-blocking — website lead was already saved
      }
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
