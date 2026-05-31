// Maps Supabase / Postgres errors to a customer-safe message + a structured,
// loud server-side log so config bugs (wrong service-role key, missing
// migration, etc.) jump out in Netlify function logs and don't get swallowed
// behind a vague "Internal Server Error".
//
// Usage:
//   const { error } = await supabase.from('x').insert(...);
//   if (error) {
//     const mapped = mapDbError(error, { route: 'create-site', userId });
//     return NextResponse.json({ error: mapped.customer, code: mapped.code }, { status: mapped.httpStatus });
//   }

const PG_CODE_MAP = {
  '42501': {
    code: 'DB_PERMISSION_DENIED',
    httpStatus: 503,
    customer: 'Our server is missing a database permission. Please contact support — this is a configuration issue on our end, not your account.',
    diagnosis: 'Postgres 42501 (permission denied). The role making the connection lacks grants on the target table. Most common cause: SUPABASE_SERVICE_ROLE_KEY is set to the anon key, or to a key from a different Supabase project. Decode the JWT and confirm payload.role === "service_role" and payload.ref matches the target project.',
  },
  '42P01': {
    code: 'DB_TABLE_MISSING',
    httpStatus: 503,
    customer: 'Our database is missing a required table. Please contact support — this is a configuration issue on our end.',
    diagnosis: 'Postgres 42P01 (undefined_table). The target table does not exist in this database. Most common cause: migrations were not applied to this Supabase project, or the request hit the wrong project entirely.',
  },
  '42703': {
    code: 'DB_COLUMN_MISSING',
    httpStatus: 503,
    customer: 'Our database is out of date. Please contact support — this is a configuration issue on our end.',
    diagnosis: 'Postgres 42703 (undefined_column). Likely a pending migration that has not been applied.',
  },
  '23505': {
    code: 'DB_DUPLICATE',
    httpStatus: 409,
    customer: 'That record already exists.',
    diagnosis: 'Postgres 23505 (unique_violation).',
  },
  '23503': {
    code: 'DB_FK_VIOLATION',
    httpStatus: 400,
    customer: 'A referenced record does not exist.',
    diagnosis: 'Postgres 23503 (foreign_key_violation).',
  },
  '23502': {
    code: 'DB_NULL_VIOLATION',
    httpStatus: 400,
    customer: 'A required field is missing.',
    diagnosis: 'Postgres 23502 (not_null_violation).',
  },
  'PGRST301': {
    code: 'DB_JWT_INVALID',
    httpStatus: 401,
    customer: 'Your session has expired. Please log in again.',
    diagnosis: 'PostgREST PGRST301 — JWT validation failed. Token expired, wrong issuer, or wrong JWT secret.',
  },
};

const DEFAULT_MAP = {
  code: 'DB_UNKNOWN',
  httpStatus: 500,
  customer: 'Something went wrong on our end. Please try again or contact support if this keeps happening.',
  diagnosis: 'Unmapped database error — see raw message.',
};

export function mapDbError(error, context = {}) {
  if (!error) return null;
  const pgCode = error.code || error?.error?.code || null;
  const known = pgCode && PG_CODE_MAP[pgCode] ? PG_CODE_MAP[pgCode] : DEFAULT_MAP;

  const payload = {
    code: known.code,
    httpStatus: known.httpStatus,
    customer: known.customer,
    diagnosis: known.diagnosis,
    pgCode,
    raw: error.message || String(error),
    details: error.details || null,
    hint: error.hint || null,
    context,
  };

  // Loud, greppable log. Search Netlify function logs for "[CRITICAL][API_ERROR]"
  // to find every misconfiguration-class failure across all routes.
  console.error('[CRITICAL][API_ERROR]', JSON.stringify(payload));
  return payload;
}
