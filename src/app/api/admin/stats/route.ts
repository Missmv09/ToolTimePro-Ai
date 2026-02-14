import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, getAdminClient } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * Returns platform-wide metrics for the vendor admin dashboard.
 */
export async function GET(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      totalCompaniesResult,
      activeCompaniesResult,
      trialCompaniesResult,
      paidCompaniesResult,
      newSignupsThisMonthResult,
      newSignupsLastMonthResult,
      totalUsersResult,
      recentSignupsResult,
      expiringTrialsResult,
      planDistributionResult,
    ] = await Promise.all([
      // Total companies
      supabase.from('companies').select('*', { count: 'exact', head: true }),

      // Active companies (signed up in last 30 days or have stripe_customer_id)
      supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .or(`stripe_customer_id.not.is.null,created_at.gte.${thirtyDaysAgo}`),

      // Trial companies (no stripe_customer_id, trial not expired)
      supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .is('stripe_customer_id', null)
        .gte('trial_ends_at', now.toISOString()),

      // Paid companies (have stripe_customer_id)
      supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .not('stripe_customer_id', 'is', null),

      // New signups this month
      supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),

      // New signups last month
      supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfLastMonth)
        .lte('created_at', endOfLastMonth),

      // Total users across all companies
      supabase.from('users').select('*', { count: 'exact', head: true }),

      // Recent signups (last 10)
      supabase
        .from('companies')
        .select('id, name, email, plan, stripe_customer_id, trial_starts_at, trial_ends_at, created_at, industry')
        .order('created_at', { ascending: false })
        .limit(10),

      // Trials expiring in next 7 days
      supabase
        .from('companies')
        .select('id, name, email, trial_ends_at, created_at')
        .is('stripe_customer_id', null)
        .gte('trial_ends_at', now.toISOString())
        .lte('trial_ends_at', sevenDaysAgo.replace('-', '+')) // next 7 days
        .order('trial_ends_at', { ascending: true })
        .limit(10),

      // Plan distribution
      supabase.from('companies').select('plan'),
    ]);

    // Calculate plan distribution
    const planCounts: Record<string, number> = {};
    if (planDistributionResult.data) {
      for (const company of planDistributionResult.data) {
        const plan = company.plan || 'starter';
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      }
    }

    const stats = {
      totalCompanies: totalCompaniesResult.count || 0,
      activeCompanies: activeCompaniesResult.count || 0,
      trialCompanies: trialCompaniesResult.count || 0,
      paidCompanies: paidCompaniesResult.count || 0,
      newSignupsThisMonth: newSignupsThisMonthResult.count || 0,
      newSignupsLastMonth: newSignupsLastMonthResult.count || 0,
      totalUsers: totalUsersResult.count || 0,
      recentSignups: recentSignupsResult.data || [],
      expiringTrials: expiringTrialsResult.data || [],
      planDistribution: planCounts,
    };

    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
