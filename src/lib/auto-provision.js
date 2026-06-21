import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendCheckoutWelcomeWithLoginLink } from '@/lib/email';

let supabaseAdmin = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseAdmin;
}

// Provisions a brand-new company for a customer who paid via Stripe Checkout
// before signing up. Mirrors the regular /api/signup flow (auth user +
// handle_new_signup RPC + magic-link email), but without requiring a company
// name from the customer — they'll set that during onboarding.
//
// Returns { companyId, error }. companyId is null on failure.
export async function autoCreateCompanyForCheckout({
  email,
  fullName,
  plan,
  addons = [],
  stripeCustomerId,
  skipTrial = false,
  baseUrl,
}) {
  if (!email) {
    return { companyId: null, error: 'email is required' };
  }

  const admin = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  const derivedName = (fullName && fullName.trim()) || normalizedEmail.split('@')[0];
  // Placeholder — customer renames during onboarding. The trailing
  // "(pending setup)" makes orphans easy to spot in admin views.
  const companyName = `${derivedName} (pending setup)`;

  // Reuse an existing auth user if present (e.g. they signed up but the
  // signup trigger never finished). Otherwise create one.
  let authUserId;
  let createdAuthUser = false;
  try {
    const { data: listData } = await admin.auth.admin.listUsers();
    const existing = listData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existing) {
      authUserId = existing.id;
    } else {
      const tempPassword = crypto.randomUUID() + 'Aa1!';
      const { data: createData, error: createError } =
        await admin.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: derivedName, needs_password: true },
          app_metadata: { needs_password: true },
        });
      if (createError || !createData?.user) {
        return {
          companyId: null,
          error: createError?.message || 'failed to create auth user',
        };
      }
      authUserId = createData.user.id;
      createdAuthUser = true;
    }
  } catch (err) {
    return { companyId: null, error: `auth user lookup/create failed: ${err.message}` };
  }

  // Create company + users-row via the same RPC the signup endpoint uses.
  // If the rows already exist (rare race), we'll find the company below
  // and skip the create error.
  const { error: rpcError } = await admin.rpc('handle_new_signup', {
    p_user_id: authUserId,
    p_email: normalizedEmail,
    p_full_name: derivedName,
    p_company_name: companyName,
  });

  if (rpcError) {
    const duplicate = /duplicate|already exists|unique/i.test(rpcError.message || '');
    if (!duplicate) {
      if (createdAuthUser) {
        await admin.auth.admin.deleteUser(authUserId).catch(() => {});
      }
      return { companyId: null, error: `handle_new_signup failed: ${rpcError.message}` };
    }
  }

  // Look up the company we just created (or found).
  const { data: company, error: lookupError } = await admin
    .from('companies')
    .select('id')
    .ilike('email', normalizedEmail)
    .single();

  if (lookupError || !company?.id) {
    return {
      companyId: null,
      error: lookupError?.message || 'company not found after signup',
    };
  }

  const updateData = {
    stripe_customer_id: stripeCustomerId,
    plan: plan || 'starter',
    subscription_status: skipTrial ? 'active' : 'trialing',
    updated_at: new Date().toISOString(),
  };
  if (addons.length > 0) {
    updateData.addons = addons;
  }

  const { error: updateError } = await admin
    .from('companies')
    .update(updateData)
    .eq('id', company.id);

  if (updateError) {
    return { companyId: company.id, error: `company update failed: ${updateError.message}` };
  }

  // Guarantee a users row links this auth user to the company. handle_new_signup
  // only creates it when it inserts a *fresh* company; for an existing company
  // whose auth login was deleted or never finished (an "orphan"), the company
  // INSERT fails on the unique email and the users INSERT never runs — leaving
  // a customer who can't sign in. Re-creating the link here makes provisioning
  // idempotent and self-healing. (No-op re-affirm for normal fresh signups.)
  const { error: linkError } = await admin
    .from('users')
    .upsert(
      {
        id: authUserId,
        email: normalizedEmail,
        full_name: derivedName,
        company_id: company.id,
        role: 'owner',
      },
      { onConflict: 'id' }
    );
  if (linkError) {
    return { companyId: company.id, error: `user link failed: ${linkError.message}` };
  }

  // Issue a magic link the customer can click from the welcome email to log
  // in without needing to set a password first. generateLink can clear
  // user_metadata, so we re-affirm needs_password after.
  let loginUrl = `${baseUrl}/auth/login`;
  try {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: { redirectTo: `${baseUrl}/auth/callback` },
    });
    if (!linkError && linkData?.properties?.hashed_token) {
      loginUrl = `${baseUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`;
    }
    await admin.auth.admin.updateUserById(authUserId, {
      user_metadata: { full_name: derivedName, needs_password: true },
      app_metadata: { needs_password: true },
    });
  } catch (err) {
    console.error('Magic-link generation failed, falling back to login URL:', err.message);
  }

  try {
    await sendCheckoutWelcomeWithLoginLink({
      to: normalizedEmail,
      name: derivedName,
      plan: plan || 'starter',
      loginUrl,
    });
  } catch (err) {
    return { companyId: company.id, error: `welcome email failed: ${err.message}` };
  }

  return { companyId: company.id, error: null };
}
