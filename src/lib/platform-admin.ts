import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client using the service role key.
 * This bypasses RLS and can query across all companies.
 * Only use in server-side API routes.
 */
export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Checks if an email is a platform admin.
 * First checks the PLATFORM_ADMIN_EMAILS env var (comma-separated),
 * then falls back to the platform_admins database table.
 */
export async function isPlatformAdmin(email: string): Promise<boolean> {
  // Quick check: env var list (for bootstrapping before DB is set up)
  const envAdmins = process.env.PLATFORM_ADMIN_EMAILS;
  if (envAdmins) {
    const adminEmails = envAdmins.split(',').map((e) => e.trim().toLowerCase());
    if (adminEmails.includes(email.toLowerCase())) {
      return true;
    }
  }

  // Database check
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('platform_admins')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts the user's email from the Authorization header (Bearer token).
 * Returns null if invalid or not a platform admin.
 */
export async function verifyPlatformAdmin(request: Request): Promise<{ email: string; userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');

  try {
    const admin = getAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);

    if (error || !user?.email) return null;

    const isAdmin = await isPlatformAdmin(user.email);
    if (!isAdmin) return null;

    return { email: user.email, userId: user.id };
  } catch {
    return null;
  }
}
