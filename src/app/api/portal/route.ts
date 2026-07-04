import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPortalMagicLinkEmail } from '@/lib/email';

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
// SECURITY: Rate limiting (in-memory, per IP, with TTL cleanup)
// ============================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  cleanupRateLimitMap();
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

  // ============================================================
  // PORTAL PRO: Job tracker with crew + status updates
  // ============================================================
  if (action === 'tracker') {
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id, title, description, scheduled_date, scheduled_time_start, scheduled_time_end, status, address, city, state')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_date', { ascending: true });

    // Get crew assignments for active jobs
    const jobIds = (activeJobs || []).map((j: { id: string }) => j.id);
    let assignments: { job_id: string; user: { full_name: string } | { full_name: string }[] | null }[] = [];
    if (jobIds.length > 0) {
      const { data } = await supabase
        .from('job_assignments')
        .select('job_id, user:users(full_name)')
        .in('job_id', jobIds);
      assignments = data || [];
    }

    // Get latest note per job (non-internal only)
    let latestNotes: { job_id: string; note_text: string; created_at: string }[] = [];
    if (jobIds.length > 0) {
      const { data } = await supabase
        .from('job_notes')
        .select('job_id, note_text, created_at')
        .in('job_id', jobIds)
        .eq('is_internal', false)
        .order('created_at', { ascending: false });
      latestNotes = data || [];
    }

    // Merge crew + notes into jobs
    const enrichedJobs = (activeJobs || []).map((job: { id: string }) => {
      const crew = assignments
        .filter(a => a.job_id === job.id)
        .map(a => {
          const user = Array.isArray(a.user) ? a.user[0] : a.user;
          return user?.full_name || 'Team member';
        });
      const notes = latestNotes.filter(n => n.job_id === job.id).slice(0, 3);
      return { ...job, crew, statusUpdates: notes };
    });

    return NextResponse.json({ jobs: enrichedJobs });
  }

  // ============================================================
  // PORTAL PRO: Job photos (before/during/after)
  // ============================================================
  if (action === 'photos') {
    const jobId = request.nextUrl.searchParams.get('jobId');

    if (jobId) {
      // Photos for a specific job
      if (!isValidUUID(jobId)) return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });

      const { data: photos } = await supabase
        .from('job_photos')
        .select('id, photo_url, photo_type, caption, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      // Verify job belongs to customer
      const { data: job } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('id', jobId)
        .eq('customer_id', session.customer_id)
        .single();

      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

      return NextResponse.json({ photos: photos || [], job });
    }

    // All jobs with photos for this customer
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, scheduled_date, status')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .in('status', ['in_progress', 'completed'])
      .order('scheduled_date', { ascending: false })
      .limit(20);

    const allJobIds = (jobs || []).map((j: { id: string }) => j.id);
    let photos: { job_id: string; id: string; photo_url: string; photo_type: string; caption: string | null; created_at: string }[] = [];
    if (allJobIds.length > 0) {
      const { data } = await supabase
        .from('job_photos')
        .select('job_id, id, photo_url, photo_type, caption, created_at')
        .in('job_id', allJobIds)
        .order('created_at', { ascending: false });
      photos = data || [];
    }

    // Group photos by job
    const jobsWithPhotos = (jobs || [])
      .map((job: { id: string }) => ({
        ...job,
        photos: photos.filter(p => p.job_id === job.id),
      }))
      .filter((j: { photos: unknown[] }) => j.photos.length > 0);

    return NextResponse.json({ jobs: jobsWithPhotos });
  }

  // ============================================================
  // PORTAL PRO: Messages
  // ============================================================
  if (action === 'messages') {
    const jobId = request.nextUrl.searchParams.get('jobId');

    let query = supabase
      .from('portal_messages')
      .select('id, job_id, sender_type, sender_name, message, is_read, created_at')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .order('created_at', { ascending: true });

    if (jobId) {
      if (!isValidUUID(jobId)) return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
      query = query.eq('job_id', jobId);
    }

    const { data: messages } = await query;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('portal_messages')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .eq('sender_type', 'contractor')
      .eq('is_read', false);

    // Get jobs that have message threads
    const { data: threadJobs } = await supabase
      .from('jobs')
      .select('id, title, status, scheduled_date')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .order('scheduled_date', { ascending: false })
      .limit(20);

    return NextResponse.json({
      messages: messages || [],
      unreadCount: unreadCount || 0,
      jobs: threadJobs || [],
    });
  }

  // ============================================================
  // PORTAL PRO: Documents vault
  // ============================================================
  if (action === 'documents') {
    const { data: documents } = await supabase
      .from('portal_documents')
      .select('id, job_id, title, description, document_type, file_url, file_name, file_size, created_at')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ documents: documents || [] });
  }

  // ============================================================
  // PORTAL PRO: Service history (full timeline)
  // ============================================================
  if (action === 'history') {
    const { data: allJobs } = await supabase
      .from('jobs')
      .select('id, title, description, scheduled_date, status, total_amount, address')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .order('scheduled_date', { ascending: false })
      .limit(50);

    // Get totals
    const { data: invoiceTotals } = await supabase
      .from('invoices')
      .select('total, amount_paid, status')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id);

    const totalSpent = (invoiceTotals || [])
      .filter((i: { status: string }) => i.status === 'paid')
      .reduce((sum: number, i: { total: number }) => sum + i.total, 0);

    const totalJobs = (allJobs || []).length;
    const completedJobs = (allJobs || []).filter((j: { status: string }) => j.status === 'completed').length;

    // Get the earliest job date to compute "member since"
    const { data: firstJob } = await supabase
      .from('jobs')
      .select('scheduled_date')
      .eq('customer_id', session.customer_id)
      .eq('company_id', session.company_id)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      jobs: allJobs || [],
      stats: {
        totalJobs,
        completedJobs,
        totalSpent,
        memberSince: firstJob?.scheduled_date || null,
      },
    });
  }

  // ============================================================
  // SMS PREFERENCES: Get customer SMS consent status
  // ============================================================
  if (action === 'sms_preferences') {
    const { data: customer } = await supabase
      .from('customers')
      .select('sms_consent, sms_consent_date, phone')
      .eq('id', session.customer_id)
      .single();

    return NextResponse.json({
      sms_consent: customer?.sms_consent || false,
      sms_consent_date: customer?.sms_consent_date || null,
      phone: customer?.phone || null,
    });
  }

  // ============================================================
  // PORTAL PRO: Check if company has Portal Pro addon
  // ============================================================
  if (action === 'check_pro') {
    const { data: company } = await supabase
      .from('companies')
      .select('addons, plan')
      .eq('id', session.company_id)
      .single();

    const addons = (company?.addons || []) as string[];
    const hasPro =
      addons.includes('customer_portal_pro') ||
      addons.includes('portal_pro') ||
      company?.plan === 'elite';

    return NextResponse.json({ hasPortalPro: hasPro });
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

    // Send magic link email via Resend
    console.log(`[Portal] Magic link for ${email}: ${portalUrl}`);
    try {
      await sendPortalMagicLinkEmail({
        to: email,
        portalUrl,
        companyName: company?.name || 'your service provider',
      });
    } catch (emailErr) {
      console.error('[Portal] Failed to send magic link email:', emailErr);
      // Don't fail the request — the link was created successfully
    }

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

  // PORTAL PRO: Send a message
  if (action === 'send_message') {
    const { jobId, message } = body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (jobId && !isValidUUID(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Get customer name
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', session.customer_id)
      .single();

    const { error } = await (supabase as any).from('portal_messages').insert({
      company_id: session.company_id,
      customer_id: session.customer_id,
      job_id: jobId || null,
      sender_type: 'customer',
      sender_name: customer?.name || 'Customer',
      message: message.substring(0, 2000), // Limit message length
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logPortalAccess(supabase, session.company_id, session.customer_id, 'message_sent', clientIp);
    return NextResponse.json({ success: true });
  }

  // PORTAL PRO: Mark messages as read
  if (action === 'mark_messages_read') {
    const { jobId } = body;
    let query = (supabase as any)
      .from('portal_messages')
      .update({ is_read: true })
      .eq('customer_id', session.customer_id)
      .eq('sender_type', 'contractor')
      .eq('is_read', false);

    if (jobId) query = query.eq('job_id', jobId);
    await query;

    return NextResponse.json({ success: true });
  }

  // Update SMS preferences
  if (action === 'update_sms_preferences') {
    const { sms_consent } = body;

    if (typeof sms_consent !== 'boolean') {
      return NextResponse.json({ error: 'sms_consent must be a boolean' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      sms_consent,
      sms_consent_date: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', session.customer_id);

    if (error) {
      // Retry without sms_consent_date if column doesn't exist yet
      if (error.message?.includes('sms_consent_date')) {
        await supabase
          .from('customers')
          .update({ sms_consent })
          .eq('id', session.customer_id);
      } else {
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
      }
    }

    await logPortalAccess(supabase, session.company_id, session.customer_id, 'sms_consent_updated', clientIp, `SMS consent set to ${sms_consent}`);

    return NextResponse.json({ success: true, sms_consent });
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
