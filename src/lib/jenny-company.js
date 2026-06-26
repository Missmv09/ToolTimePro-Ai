// Resolve which company owns an inbound Twilio number (multi-tenant routing).
//
// Resolution order:
//   1. company_phone_numbers mapping — the real multi-tenant path: each
//      contractor's number → their company.
//   2. JENNY_COMPANY_ID env var — explicit single-tenant pin (useful for
//      testing or a single live business).
//   3. First company in the DB — legacy single-tenant fallback.
//
// Used by the SMS webhook and the voice receptionist so both answer as the
// correct contractor (their name, services, and calendar).

/**
 * @param {object} supabase - service-role client (bypasses RLS)
 * @param {string} toNumber - the Twilio number that was texted/called
 * @returns {Promise<{id: string, name: string|null, business_type: string|null} | null>}
 */
async function resolveCompanyByNumber(supabase, toNumber) {
  let companyId = null;

  // 1. Number → company mapping
  const last10 = String(toNumber || '').replace(/\D/g, '').slice(-10);
  if (last10.length >= 7) {
    const { data: match } = await supabase
      .from('company_phone_numbers')
      .select('company_id')
      .eq('is_active', true)
      .ilike('phone_number', `%${last10}`)
      .limit(1)
      .maybeSingle();
    if (match?.company_id) companyId = match.company_id;
  }

  // 2. Explicit pin
  if (!companyId && process.env.JENNY_COMPANY_ID) {
    companyId = process.env.JENNY_COMPANY_ID;
  }

  // 3. Legacy fallback — first company
  if (!companyId) {
    const { data: companies } = await supabase.from('companies').select('id').limit(1);
    if (companies?.length) companyId = companies[0].id;
  }

  if (!companyId) return null;

  // Load the company's display info for greetings / messaging.
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, business_type')
    .eq('id', companyId)
    .maybeSingle();

  return company || { id: companyId, name: null, business_type: null };
}

module.exports = { resolveCompanyByNumber };
