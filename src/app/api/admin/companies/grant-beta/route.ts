import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, getAdminClient } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/companies/grant-beta
 * Grants full beta-tester access to an EXISTING account, resolved by email.
 *
 * Unlike POST /api/admin/companies (which creates a brand-new company), this
 * finds the company an already-signed-up user belongs to and upgrades it.
 * Mirrors the "toggle_beta_tester" enable path: is_beta_tester=true,
 * plan='elite', and a 1-year trial so access never expires during the beta.
 *
 * Body:
 *   email      - the account email to grant access to (required)
 *   beta_notes - optional note stored on the company
 */
export async function POST(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Resolve the company: first by the company's own email, then by any user
    // who signed up with this email (the user may differ from the company email).
    let companyId: string | null = null;

    const { data: byCompanyEmail } = await supabase
      .from('companies')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (byCompanyEmail?.id) {
      companyId = byCompanyEmail.id;
    } else {
      const { data: byUser } = await supabase
        .from('users')
        .select('company_id')
        .ilike('email', email)
        .not('company_id', 'is', null)
        .maybeSingle();
      companyId = byUser?.company_id ?? null;
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'No account found for this email. They must sign up first, then try again.' },
        { status: 404 }
      );
    }

    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (fetchError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const trialEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const { data: updated, error } = await supabase
      .from('companies')
      .update({
        is_beta_tester: true,
        plan: 'elite',
        trial_ends_at: trialEnd.toISOString(),
        trial_starts_at: company.trial_starts_at || new Date().toISOString(),
        beta_notes: company.beta_notes || body.beta_notes || 'Beta tester — granted full access',
      })
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      company: updated,
      message: `Granted full beta access to ${updated.name || email} — Elite plan, all features, 1-year trial.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
