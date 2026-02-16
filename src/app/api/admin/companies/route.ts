import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, getAdminClient } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies
 * Returns all companies with search, filter, and pagination.
 *
 * Query params:
 *   search - search by name or email
 *   status - filter: all | trial | paid | expired
 *   plan - filter by plan: starter | pro | elite
 *   sort - sort field: created_at | name | plan (default: created_at)
 *   order - asc | desc (default: desc)
 *   page - page number (default: 1)
 *   limit - items per page (default: 25)
 */
export async function GET(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const url = new URL(request.url);

    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const plan = url.searchParams.get('plan') || '';
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') || 'desc';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);

    const offset = (page - 1) * limit;
    const now = new Date().toISOString();

    // Build query
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' });

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Status filter
    if (status === 'trial') {
      query = query.is('stripe_customer_id', null).gte('trial_ends_at', now);
    } else if (status === 'paid') {
      query = query.not('stripe_customer_id', 'is', null);
    } else if (status === 'expired') {
      query = query.is('stripe_customer_id', null).lt('trial_ends_at', now);
    } else if (status === 'beta') {
      query = query.eq('is_beta_tester', true);
    }

    // Plan filter
    if (plan) {
      query = query.eq('plan', plan);
    }

    // Sort
    const ascending = order === 'asc';
    query = query.order(sort, { ascending });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For each company, get user count
    const companyIds = (data || []).map((c: { id: string }) => c.id);
    let userCounts: Record<string, number> = {};

    if (companyIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('company_id')
        .in('company_id', companyIds);

      if (users) {
        for (const u of users) {
          if (u.company_id) {
            userCounts[u.company_id] = (userCounts[u.company_id] || 0) + 1;
          }
        }
      }
    }

    const companies = (data || []).map((c: Record<string, unknown>) => ({
      ...c,
      user_count: userCounts[(c as { id: string }).id] || 0,
      status: getCompanyStatus(c as { stripe_customer_id: string | null; trial_ends_at: string | null }),
    }));

    return NextResponse.json({
      companies,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/companies
 * Creates a new company and optionally marks it as a beta tester.
 *
 * Body:
 *   name - company name (required)
 *   email - company email (required)
 *   phone - phone number (optional)
 *   industry - industry type (optional)
 *   is_beta_tester - whether to mark as beta tester (optional, default false)
 *   beta_notes - notes about the beta tester (optional)
 */
export async function POST(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const { name, email, phone, industry, is_beta_tester, beta_notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A company with this email already exists' },
        { status: 409 }
      );
    }

    const now = new Date();
    const trialEnd = new Date(now);

    // Beta testers get 1 year, regular companies get 14-day trial
    if (is_beta_tester) {
      trialEnd.setFullYear(trialEnd.getFullYear() + 1);
    } else {
      trialEnd.setDate(trialEnd.getDate() + 14);
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name,
        email,
        phone: phone || null,
        industry: industry || null,
        plan: is_beta_tester ? 'elite' : 'pro',
        is_beta_tester: is_beta_tester || false,
        beta_notes: beta_notes || null,
        trial_starts_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        onboarding_completed: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getCompanyStatus(company: { stripe_customer_id: string | null; trial_ends_at: string | null }): string {
  if (company.stripe_customer_id) return 'paid';
  if (!company.trial_ends_at) return 'no_trial';
  if (new Date(company.trial_ends_at) > new Date()) return 'trial';
  return 'expired';
}
