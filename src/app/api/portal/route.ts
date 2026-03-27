import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// GET — Fetch portal data for authenticated customer
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const token = request.headers.get('x-portal-token') || request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'No session token' }, { status: 401 });

  // Validate session
  const { data: session } = await supabase
    .from('customer_sessions')
    .select('customer_id, company_id, email, expires_at, is_active')
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // Update last accessed
  await supabase.from('customer_sessions').update({ last_accessed_at: new Date().toISOString() }).eq('token', token);

  const action = request.nextUrl.searchParams.get('action');

  // Fetch customer profile
  if (action === 'profile') {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email, phone, address, city, state, zip')
      .eq('id', session.customer_id)
      .single();

    const { data: company } = await supabase
      .from('companies')
      .select('name, phone, email')
      .eq('id', session.company_id)
      .single();

    return NextResponse.json({ customer, company });
  }

  // Fetch upcoming appointments (jobs)
  if (action === 'appointments') {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, description, scheduled_date, scheduled_time_start, scheduled_time_end, status, address')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_date', { ascending: true });

    const { data: pastJobs } = await supabase
      .from('jobs')
      .select('id, title, scheduled_date, status, total_amount')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false })
      .limit(10);

    return NextResponse.json({ upcoming: jobs || [], past: pastJobs || [] });
  }

  // Fetch invoices
  if (action === 'invoices') {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, amount_paid, status, due_date, sent_at, paid_at')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ invoices: invoices || [] });
  }

  // Fetch quotes
  if (action === 'quotes') {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, quote_number, title, total, status, valid_until, sent_at')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .in('status', ['sent', 'viewed', 'approved'])
      .order('created_at', { ascending: false });

    return NextResponse.json({ quotes: quotes || [] });
  }

  // Dashboard summary
  const [jobsRes, invoicesRes, quotesRes] = await Promise.all([
    supabase.from('jobs').select('id, title, scheduled_date, scheduled_time_start, status')
      .eq('customer_id', session.customer_id).eq('company_id', session.company_id)
      .in('status', ['scheduled', 'in_progress']).order('scheduled_date', { ascending: true }).limit(5),
    supabase.from('invoices').select('id, invoice_number, total, amount_paid, status, due_date')
      .eq('customer_id', session.customer_id).eq('company_id', session.company_id)
      .in('status', ['sent', 'viewed', 'partial', 'overdue']).order('created_at', { ascending: false }).limit(5),
    supabase.from('quotes').select('id, quote_number, title, total, status')
      .eq('customer_id', session.customer_id).eq('company_id', session.company_id)
      .in('status', ['sent', 'viewed']).order('created_at', { ascending: false }).limit(5),
  ]);

  const { data: customer } = await supabase
    .from('customers').select('name, email').eq('id', session.customer_id).single();

  const { data: company } = await supabase
    .from('companies').select('name, phone').eq('id', session.company_id).single();

  return NextResponse.json({
    customer,
    company,
    upcomingJobs: jobsRes.data || [],
    openInvoices: invoicesRes.data || [],
    pendingQuotes: quotesRes.data || [],
  });
}

// POST — Handle login (send magic link) and actions
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const body = await request.json();
  const { action } = body;

  // Send magic link
  if (action === 'send_login_link') {
    const { email, companyId } = body;
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Find customer by email
    const query = supabase.from('customers').select('id, name, email, company_id').eq('email', email);
    if (companyId) query.eq('company_id', companyId);

    const { data: customers } = await query;
    if (!customers || customers.length === 0) {
      // Don't reveal if email exists — always show success
      return NextResponse.json({ success: true, message: 'If an account exists, a login link has been sent.' });
    }

    const customer = customers[0];

    // Create session token (valid 30 days)
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase.from('customer_sessions').insert({
      customer_id: customer.id,
      company_id: customer.company_id,
      token,
      email: customer.email,
      expires_at: expiresAt.toISOString(),
    });

    // Get company info for email
    const { data: company } = await supabase
      .from('companies').select('name').eq('id', customer.company_id).single();

    const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.tooltimepro.com'}/portal?token=${token}`;

    // TODO: Send email with portalUrl via Resend
    // For now, log it (in production, this sends an email)
    console.log(`[Portal] Magic link for ${email}: ${portalUrl}`);

    return NextResponse.json({ success: true, message: 'If an account exists, a login link has been sent.' });
  }

  // Validate token for authenticated actions
  const token = request.headers.get('x-portal-token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabase
    .from('customer_sessions').select('customer_id, company_id').eq('token', token).eq('is_active', true).single();

  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  // Request reschedule
  if (action === 'request_reschedule') {
    const { jobId, requestedDate, requestedTimeStart, reason } = body;

    const { error } = await supabase.from('reschedule_requests').insert({
      company_id: session.company_id,
      customer_id: session.customer_id,
      job_id: jobId,
      requested_date: requestedDate,
      requested_time_start: requestedTimeStart || null,
      reason: reason || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Logout
  if (action === 'logout') {
    await supabase.from('customer_sessions').update({ is_active: false }).eq('token', token);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
