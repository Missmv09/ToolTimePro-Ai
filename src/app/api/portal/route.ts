import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ============================================================
// SECURITY: Crypto-secure token generation (Web Crypto API)
// ============================================================
function generateSecureToken(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Hash token for storage using Web Crypto API
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// SECURITY: Rate limiting (in-memory, per IP)
// ============================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

// ============================================================
// SECURITY: Input validation
// ============================================================
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255;
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ============================================================
// SECURITY: Validate session with hashed token lookup
// ============================================================
async function validateSession(supabase: any, rawToken: string) {
  const hashedToken = await hashToken(rawToken);

  const { data } = await supabase
    .from('customer_sessions')
    .select('id, customer_id, company_id, email, expires_at, is_active')
    .eq('token', hashedToken)
    .eq('is_active', true)
    .single();

  const session = data as { id: string; customer_id: string; company_id: string; email: string; expires_at: string; is_active: boolean } | null;

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    // Auto-deactivate expired sessions
    await (supabase as any).from('customer_sessions').update({ is_active: false }).eq('id', session.id);
    return null;
  }

  // Update last accessed
  await (supabase as any).from('customer_sessions').update({
    last_accessed_at: new Date().toISOString(),
  }).eq('id', session.id);

  return session;
}

// ============================================================
// SECURITY: Log portal access for audit trail
// ============================================================
async function logPortalAccess(
  supabase: any,
  companyId: string,
  customerId: string,
  action: string,
  ip: string,
  details?: string
) {
  // Use jenny_action_log for audit trail (reuse existing table)
  await (supabase as any).from('jenny_action_log').insert({
    company_id: companyId,
    action_type: 'review_request', // Repurpose for portal activity
    title: `Portal: ${action}`,
    description: details || `Customer accessed portal: ${action}`,
    status: 'executed',
    target_id: customerId,
    target_type: 'customer',
    metadata: { ip, action, timestamp: new Date().toISOString() },
    executed_at: new Date().toISOString(),
  }).catch(() => {}); // Don't fail on audit log errors
}

// ============================================================
// GET — Fetch portal data for authenticated customer
// ============================================================
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const rawToken = request.headers.get('x-portal-token') || request.nextUrl.searchParams.get('token');
  if (!rawToken || rawToken.length < 20) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const session = await validateSession(supabase, rawToken);
  if (!session) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

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

// ============================================================
// POST — Handle login (send magic link) and authenticated actions
// ============================================================
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const clientIp = getClientIp(request);
  const body = await request.json();
  const { action } = body;

  // ============================================================
  // SEND MAGIC LINK (rate-limited, no auth required)
  // ============================================================
  if (action === 'send_login_link') {
    // Rate limit: 5 login attempts per IP per 15 minutes
    if (!checkRateLimit(`login:${clientIp}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 15 minutes.' },
        { status: 429 }
      );
    }

    const { email, companyId } = body;

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // Find customer by email
    const query = supabase.from('customers').select('id, name, email, company_id').eq('email', email.toLowerCase().trim());
    if (companyId) query.eq('company_id', companyId);

    const { data: customers } = await query;
    if (!customers || customers.length === 0) {
      // SECURITY: Don't reveal if email exists — always show success
      return NextResponse.json({ success: true, message: 'If an account exists, a login link has been sent.' });
    }

    const customer = customers[0];

    // Deactivate any existing active sessions for this customer (single session)
    await (supabase as any).from('customer_sessions')
      .update({ is_active: false })
      .eq('customer_id', customer.id)
      .eq('is_active', true);

    // Generate crypto-secure token
    const rawToken = generateSecureToken();
    const hashedToken = await hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await (supabase as any).from('customer_sessions').insert({
      customer_id: customer.id,
      company_id: customer.company_id,
      token: hashedToken, // Store HASHED token, not raw
      email: customer.email,
      expires_at: expiresAt.toISOString(),
    });

    // Build portal URL with RAW token (only the customer receives this)
    const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.tooltimepro.com'}/portal?token=${rawToken}`;

    // Get company name for email
    const { data: company } = await supabase
      .from('companies').select('name').eq('id', customer.company_id).single();

    // TODO: Send email via Resend with portalUrl
    console.log(`[Portal] Magic link for ${email}: ${portalUrl}`);

    // Log access attempt
    await logPortalAccess(supabase, customer.company_id, customer.id, 'login_requested', clientIp, `Login link sent to ${email}`);

    return NextResponse.json({ success: true, message: 'If an account exists, a login link has been sent.' });
  }

  // ============================================================
  // AUTHENTICATED ACTIONS (require valid token)
  // ============================================================
  const rawToken = request.headers.get('x-portal-token');
  if (!rawToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await validateSession(supabase, rawToken);
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  // Rate limit authenticated actions: 30 per minute per session
  if (!checkRateLimit(`action:${session.id}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Request reschedule
  if (action === 'request_reschedule') {
    const { jobId, requestedDate, requestedTimeStart, reason } = body;

    // Validate jobId is a UUID
    if (!jobId || !isValidUUID(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Verify job belongs to this customer
    const { data: job } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .single();

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Rate limit reschedule requests: 3 per hour per customer
    if (!checkRateLimit(`reschedule:${session.customer_id}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many reschedule requests. Please try again later.' }, { status: 429 });
    }

    const { error } = await (supabase as any).from('reschedule_requests').insert({
      company_id: session.company_id,
      customer_id: session.customer_id,
      job_id: jobId,
      requested_date: requestedDate,
      requested_time_start: requestedTimeStart || null,
      reason: reason?.substring(0, 500) || null, // Limit reason length
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logPortalAccess(supabase, session.company_id, session.customer_id, 'reschedule_requested', clientIp, `Reschedule requested for job ${jobId}`);

    return NextResponse.json({ success: true });
  }

  // Logout — deactivate session
  if (action === 'logout') {
    const hashedToken = await hashToken(rawToken);
    await (supabase as any).from('customer_sessions').update({ is_active: false }).eq('token', hashedToken);
    await logPortalAccess(supabase, session.company_id, session.customer_id, 'logout', clientIp);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
