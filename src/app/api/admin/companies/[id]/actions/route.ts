import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, getAdminClient } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/companies/[id]/actions
 * Performs admin actions on a company.
 *
 * Body:
 *   action: 'extend_trial' | 'suspend' | 'reactivate' | 'change_plan' | 'delete'
 *   days?: number (for extend_trial)
 *   plan?: string (for change_plan)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = params;

  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { action } = body;

    // Fetch company first
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    switch (action) {
      case 'extend_trial': {
        const days = body.days || 14;
        const currentEnd = company.trial_ends_at
          ? new Date(company.trial_ends_at)
          : new Date();
        const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

        const { error } = await supabase
          .from('companies')
          .update({
            trial_ends_at: newEnd.toISOString(),
            trial_starts_at: company.trial_starts_at || new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ message: `Trial extended by ${days} days`, newTrialEnd: newEnd.toISOString() });
      }

      case 'suspend': {
        // Deactivate all users in the company
        const { error } = await supabase
          .from('users')
          .update({ is_active: false })
          .eq('company_id', id);

        if (error) throw error;
        return NextResponse.json({ message: 'Company suspended - all users deactivated' });
      }

      case 'reactivate': {
        // Reactivate all users
        const { error } = await supabase
          .from('users')
          .update({ is_active: true })
          .eq('company_id', id);

        if (error) throw error;
        return NextResponse.json({ message: 'Company reactivated - all users activated' });
      }

      case 'change_plan': {
        const plan = body.plan;
        if (!plan || !['starter', 'pro', 'elite'].includes(plan)) {
          return NextResponse.json({ error: 'Invalid plan. Must be starter, pro, or elite.' }, { status: 400 });
        }

        const { error } = await supabase
          .from('companies')
          .update({ plan })
          .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ message: `Plan changed to ${plan}` });
      }

      case 'toggle_beta_tester': {
        const isBeta = !company.is_beta_tester;
        const updateData: Record<string, unknown> = {
          is_beta_tester: isBeta,
        };

        // When enabling beta: upgrade to elite plan and extend trial generously
        if (isBeta) {
          updateData.plan = 'elite';
          // Set trial to 1 year from now so it doesn't expire during beta
          updateData.trial_ends_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
          if (!company.trial_starts_at) {
            updateData.trial_starts_at = new Date().toISOString();
          }
        }

        const { error } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
        return NextResponse.json({
          message: isBeta
            ? 'Beta tester enabled — upgraded to Elite with extended access'
            : 'Beta tester disabled',
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
