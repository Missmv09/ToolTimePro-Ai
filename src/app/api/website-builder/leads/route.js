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

    const { siteId, companyId: bodyCompanyId, name, phone, email, message, service, source } = body;

    if (!siteId && !bodyCompanyId) {
      return NextResponse.json({ error: 'siteId or companyId is required' }, { status: 400, headers: corsHeaders });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400, headers: corsHeaders });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email?.trim() || null;
    const trimmedPhone = phone?.trim() || null;
    const trimmedMessage = message?.trim() || null;
    const trimmedService = service?.trim() || null;
    const leadSource = source || 'website_contact_form';

    let saved = false;
    let resolvedCompanyId = bodyCompanyId || null;
    let resolvedSiteId = siteId || null;

    // Helper: try insert, if FK violation on company_id retry without it
    async function tryInsert(table, record) {
      const { error } = await supabase.from(table).insert(record);
      if (!error) return { success: true };

      console.error(`[Website Leads] ${table} insert failed:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      // 23503 = foreign key violation — retry without company_id
      if (error.code === '23503' && record.company_id) {
        console.log(`[Website Leads] Retrying ${table} without company_id`);
        const { company_id, ...withoutCompany } = record;
        const { error: retryError } = await supabase.from(table).insert(withoutCompany);
        if (!retryError) return { success: true };
        console.error(`[Website Leads] ${table} retry also failed:`, {
          message: retryError.message,
          code: retryError.code,
          details: retryError.details,
        });
      }
      return { success: false };
    }

    // If siteId provided, fetch site to get company_id
    if (siteId) {
      const { data: site, error: siteError } = await supabase
        .from('website_sites')
        .select('id, company_id, user_id, business_name')
        .eq('id', siteId)
        .single();

      if (siteError || !site) {
        console.error('[Website Leads] Site lookup failed:', siteError?.message || 'Site not found', { siteId });
        return NextResponse.json({ error: 'Site not found' }, { status: 404, headers: corsHeaders });
      }

      resolvedCompanyId = site.company_id || resolvedCompanyId;
      resolvedSiteId = site.id;

      // 1. Try website_leads table (only when we have a siteId)
      const websiteLeadRecord = {
        site_id: resolvedSiteId,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        message: trimmedMessage,
        service_requested: trimmedService,
        source: leadSource,
        status: 'new',
      };
      if (resolvedCompanyId) {
        websiteLeadRecord.company_id = resolvedCompanyId;
      }

      const wlResult = await tryInsert('website_leads', websiteLeadRecord);
      if (wlResult.success) saved = true;
    }

    // 2. Also save to CRM leads table (works with siteId or companyId)
    const crmRecord = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      message: trimmedMessage,
      service_requested: trimmedService,
      source: leadSource === 'jenny_ai_chat' ? 'jenny_ai_chat' : 'website',
      status: 'new',
    };
    if (resolvedCompanyId) {
      crmRecord.company_id = resolvedCompanyId;
    }

    const crmResult = await tryInsert('leads', crmRecord);
    if (crmResult.success) saved = true;

    // If neither table accepted the lead, return error
    if (!saved) {
      return NextResponse.json(
        { error: 'Failed to save lead. Please try again or contact us directly.' },
        { status: 500, headers: corsHeaders }
      );
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
