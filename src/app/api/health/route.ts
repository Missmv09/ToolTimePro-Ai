import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks: Record<string, unknown> = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `set (${supabaseUrl.substring(0, 30)}...)` : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? `set (${supabaseAnonKey.substring(0, 10)}...)` : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? `set (${supabaseServiceKey.substring(0, 10)}...)` : 'MISSING',
  };

  // Try to actually connect to Supabase
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      });
      checks.supabase_connection = `HTTP ${res.status}`;
    } catch (err) {
      checks.supabase_connection = `FAILED: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  // Check if ANY Netlify custom env vars are reaching the runtime
  const sampleServerVars: Record<string, string> = {};
  const serverVarNames = ['STRIPE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'RESEND_API_KEY', 'TWILIO_ACCOUNT_SID', 'CRON_SECRET'];
  for (const name of serverVarNames) {
    sampleServerVars[name] = process.env[name] ? 'SET' : 'MISSING';
  }

  // Find ALL env vars containing "SUPABASE" to check for typos/naming issues
  const allSupabaseVars = Object.keys(process.env)
    .filter(k => k.toUpperCase().includes('SUPABASE'))
    .map(k => k);

  // Show some env var names (not values) to understand what's available
  const envVarNames = Object.keys(process.env).sort().slice(0, 20);

  const allSet = supabaseUrl && supabaseAnonKey && supabaseServiceKey;

  return NextResponse.json({
    status: allSet ? 'ok' : 'missing_vars',
    checks,
    server_vars: sampleServerVars,
    all_supabase_env_var_names: allSupabaseVars,
    sample_env_names: envVarNames,
    total_env_var_count: Object.keys(process.env).length,
    timestamp: new Date().toISOString(),
  });
}
