import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, getAdminClient } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/companies/[id]
 * Returns detailed company info including users, jobs, invoices, etc.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const supabase = getAdminClient();

    // Fetch company + related data in parallel
    const [
      companyResult,
      usersResult,
      jobsCountResult,
      customersCountResult,
      invoicesResult,
      quotesCountResult,
      leadsCountResult,
    ] = await Promise.all([
      // Company details
      supabase.from('companies').select('*').eq('id', id).single(),

      // All users in this company
      supabase
        .from('users')
        .select('id, email, full_name, role, is_active, phone, last_login_at, created_at')
        .eq('company_id', id)
        .order('created_at', { ascending: true }),

      // Jobs count
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('company_id', id),

      // Customers count
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', id),

      // Invoices with totals
      supabase.from('invoices').select('status, total').eq('company_id', id),

      // Quotes count
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('company_id', id),

      // Leads count
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', id),
    ]);

    if (companyResult.error || !companyResult.data) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Calculate invoice stats
    const invoices = invoicesResult.data || [];
    const invoiceStats = {
      total: invoices.length,
      totalRevenue: invoices
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + (i.total || 0), 0),
      unpaid: invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).length,
      unpaidAmount: invoices
        .filter((i) => ['sent', 'overdue'].includes(i.status))
        .reduce((sum, i) => sum + (i.total || 0), 0),
    };

    const company = {
      ...companyResult.data,
      status: getCompanyStatus(companyResult.data),
      users: usersResult.data || [],
      stats: {
        users: (usersResult.data || []).length,
        activeUsers: (usersResult.data || []).filter((u) => u.is_active).length,
        jobs: jobsCountResult.count || 0,
        customers: customersCountResult.count || 0,
        quotes: quotesCountResult.count || 0,
        leads: leadsCountResult.count || 0,
        invoices: invoiceStats,
      },
    };

    return NextResponse.json(company);
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
