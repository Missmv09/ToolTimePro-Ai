import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Diagnostic endpoint. Hit this after every deploy (or whenever something
// looks off in the sandbox) to verify Supabase, env vars, and table grants
// are configured correctly for the current build context.
//
// Auth: requires ?token=<HEALTH_CHECK_TOKEN> matching the env var. If the env
// var isn't set, the endpoint is disabled — set the token in Netlify env
// vars (scope it to all contexts) to enable.
//
// Example:
//   curl 'https://sandbox--<site>.netlify.app/api/website-builder/health/?token=…'

function decodeJwtPayload(token) {
  try {
    const parts = (token || '').split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function shortKey(key) {
  if (!key) return null;
  if (key.length <= 12) return '***';
  return `${key.substring(0, 6)}…${key.substring(key.length - 4)}`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const expected = process.env.HEALTH_CHECK_TOKEN;

  if (!expected) {
    return NextResponse.json({
      ok: false,
      error: 'Health check is disabled. Set HEALTH_CHECK_TOKEN env var in Netlify to enable.',
    }, { status: 503 });
  }
  if (token !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const checks = {};
  const diagnoses = [];

  // 1. Env var presence
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabaseHost = null;
  try { supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null; } catch { /* ignore */ }
  checks.envVars = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `set (host: ${supabaseHost})` : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `set (${shortKey(serviceKey)})` : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? `set (${shortKey(anonKey)})` : 'MISSING',
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || '(unset)',
    NODE_ENV: process.env.NODE_ENV || '(unset)',
  };

  if (!supabaseUrl) diagnoses.push('NEXT_PUBLIC_SUPABASE_URL is missing.');
  if (!serviceKey) diagnoses.push('SUPABASE_SERVICE_ROLE_KEY is missing.');

  // 2. JWT decode — verify the service-role key really is a service-role key
  if (serviceKey) {
    const payload = decodeJwtPayload(serviceKey);
    if (!payload) {
      checks.serviceRoleKeyShape = 'not a valid JWT';
      diagnoses.push('SUPABASE_SERVICE_ROLE_KEY is not a valid JWT. Did someone paste a random string?');
    } else {
      checks.serviceRoleKeyShape = {
        role: payload.role || '(none)',
        ref: payload.ref || '(none)',
        iss: payload.iss || '(none)',
        exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : '(none)',
      };
      if (payload.role !== 'service_role') {
        diagnoses.push(`SUPABASE_SERVICE_ROLE_KEY has role="${payload.role}" — should be "service_role". This is the most common cause of "permission denied for table" errors.`);
      }
    }

    // Sanity check: anon and service-role keys should belong to the same Supabase project
    const anonPayload = anonKey ? decodeJwtPayload(anonKey) : null;
    if (anonPayload && payload && anonPayload.ref !== payload.ref) {
      diagnoses.push(`Anon key project ref (${anonPayload.ref}) does not match service-role key project ref (${payload.ref}). One of the env vars is from the wrong Supabase project.`);
    }

    // Sanity check: the supabase URL should reference the same project ref as the keys
    if (supabaseUrl && payload?.ref && !supabaseUrl.includes(payload.ref)) {
      diagnoses.push(`NEXT_PUBLIC_SUPABASE_URL (${supabaseUrl}) does not contain the service-role key project ref (${payload.ref}). URL is pointing at a different Supabase project than the keys.`);
    }
  }

  // 3. Live database connectivity — read against website_sites
  if (supabaseUrl && serviceKey) {
    // 3a. Raw HTTP probe so we see the actual PostgREST status / body
    try {
      const probe = await fetch(`${supabaseUrl}/rest/v1/website_sites?select=id&limit=1`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      const probeBody = await probe.text();
      let parsedBody = null;
      try { parsedBody = JSON.parse(probeBody); } catch { /* keep as text */ }
      checks.postgrestProbe = {
        status: probe.status,
        statusText: probe.statusText,
        body: parsedBody || probeBody.slice(0, 500),
        headers: {
          contentType: probe.headers.get('content-type'),
          wwwAuthenticate: probe.headers.get('www-authenticate'),
        },
      };
      if (probe.status === 401) {
        diagnoses.push('PostgREST returned 401. JWT was rejected — most likely the Supabase project JWT secret was rotated after this key was issued, OR the key is from a different project than the URL.');
      } else if (probe.status === 403) {
        diagnoses.push('PostgREST returned 403. Role lacks permission on website_sites.');
      } else if (probe.status === 404) {
        diagnoses.push('PostgREST returned 404. The Supabase project URL may be wrong, or the website_sites table does not exist.');
      } else if (probe.status >= 500) {
        diagnoses.push(`PostgREST returned ${probe.status}. Supabase is unhealthy or misconfigured.`);
      }
    } catch (err) {
      checks.postgrestProbe = { status: 'FAIL', error: err.message };
      diagnoses.push(`Network error reaching PostgREST: ${err.message}`);
    }

    // 3b. supabase-js client path — same query, fuller error object
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: readError, count } = await supabase
        .from('website_sites')
        .select('id', { count: 'exact', head: true });
      if (readError) {
        // Dump every enumerable field so we don't lose info to undefined codes
        const dump = {};
        for (const k of Object.keys(readError)) dump[k] = readError[k];
        checks.websiteSitesRead = { status: 'FAIL', errorObject: dump };
        if (readError.code === '42501') {
          diagnoses.push('SELECT on website_sites was denied. Confirms the SUPABASE_SERVICE_ROLE_KEY is not actually a service-role key for this project.');
        } else if (readError.code === '42P01') {
          diagnoses.push('Table website_sites does not exist in this Supabase project. Migrations have not been applied.');
        } else {
          diagnoses.push(`supabase-js error reading website_sites — code=${readError.code || '(none)'} message=${readError.message || '(empty)'}`);
        }
      } else {
        checks.websiteSitesRead = { status: 'OK', count };
      }
    } catch (err) {
      checks.websiteSitesRead = { status: 'FAIL', error: err.message };
      diagnoses.push(`Could not reach Supabase via supabase-js: ${err.message}`);
    }
  } else {
    checks.websiteSitesRead = 'skipped (env vars missing)';
  }

  const ok = diagnoses.length === 0;
  return NextResponse.json({
    ok,
    checks,
    diagnoses: ok ? ['All checks passed.'] : diagnoses,
    timestamp: new Date().toISOString(),
  }, { status: ok ? 200 : 503 });
}
