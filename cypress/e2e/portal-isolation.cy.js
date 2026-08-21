/**
 * Customer portal isolation — the customer-vs-customer boundary.
 *
 * TC-X-01 proves COMPANY vs COMPANY on the dashboard, where queries run under
 * the anon key with a user JWT and Postgres RLS is the enforcement. The portal
 * is a different mechanism entirely: /api/portal runs under
 * SUPABASE_SERVICE_ROLE_KEY, which BYPASSES RLS. Its isolation rests solely on
 * every query filtering by session.customer_id / session.company_id by hand.
 *
 * So a green TC-X-01 says nothing about this boundary. One new portal query that
 * forgets .eq('customer_id', ...) leaks every customer's invoices to every other
 * customer, and there is no database-level backstop to catch it. That is the
 * regression this spec exists to catch — it matters from the moment beta testers
 * start inviting their own customers in.
 *
 * Needs TWO portal sessions for DIFFERENT customers of the SAME company. Portal
 * login is a magic link, so rather than round-tripping a real inbox, seed two
 * long-lived rows in the sandbox `customer_sessions` table and store the RAW
 * tokens as secrets:
 *
 *   E2E_PORTAL_TOKEN_A   raw token for customer A
 *   E2E_PORTAL_TOKEN_B   raw token for customer B (a DIFFERENT customer)
 *
 * The table stores the SHA-256 hex of the raw token, never the token itself, so
 * seed with:
 *
 *   insert into customer_sessions (token, customer_id, company_id, email,
 *                                 expires_at, is_active)
 *   values (encode(digest('<raw-token>', 'sha256'), 'hex'),
 *           '<customer-uuid>', '<company-uuid>', '<customer email>',
 *           now() + interval '365 days', true);
 *
 * Customer A must have at least one invoice or appointment, or the isolation
 * assertion would be vacuously true — the spec fails loudly rather than passing
 * on empty data.
 *
 * SANDBOX ONLY. Never point these at production.
 */

const TOKEN_A = Cypress.env('E2E_PORTAL_TOKEN_A');
const TOKEN_B = Cypress.env('E2E_PORTAL_TOKEN_B');
const hasBothSessions = !!TOKEN_A && !!TOKEN_B;

const api = (token, action, extra = '') =>
  cy.request({
    url: `/api/portal?action=${action}${extra}`,
    headers: { 'x-portal-token': token },
    failOnStatusCode: false,
  });

// Collect every record id customer A can see, across the money-bearing actions.
function idsFor(token) {
  const ids = [];
  return api(token, 'invoices')
    .then((res) => {
      expect(res.status, 'invoices request').to.eq(200);
      (res.body.invoices || []).forEach((i) => ids.push(i.id));
      return api(token, 'appointments');
    })
    .then((res) => {
      expect(res.status, 'appointments request').to.eq(200);
      [...(res.body.upcoming || []), ...(res.body.past || [])].forEach((j) => ids.push(j.id));
      return cy.wrap(ids, { log: false });
    });
}

(hasBothSessions ? describe : describe.skip)('Customer portal isolation', () => {
  it('customer B cannot see any of customer A records', () => {
    let aIds = [];

    idsFor(TOKEN_A)
      .then((ids) => {
        aIds = ids;
        // GUARD AGAINST A VACUOUS PASS. If A has no records at all, "B sees none
        // of A's" is trivially true and would stay green through a total leak.
        expect(
          aIds.length,
          'customer A must own at least one invoice or appointment for this test to mean anything — seed the sandbox customer'
        ).to.be.greaterThan(0);
        return idsFor(TOKEN_B);
      })
      .then((bIds) => {
        const leaked = bIds.filter((id) => aIds.includes(id));
        expect(leaked, `records visible to BOTH customers: ${JSON.stringify(leaked)}`).to.be.empty;
      });
  });

  it("customer A job id is not readable through customer B token (IDOR)", () => {
    // The photos action takes a client-supplied jobId. It fetches job_photos by
    // that id BEFORE checking ownership, and only the ownership 404 afterwards
    // keeps the rows from being returned — correct today, but one reordering or
    // early return away from a leak. Pin the behaviour.
    api(TOKEN_A, 'photos').then((res) => {
      expect(res.status, "A's photo jobs").to.eq(200);
      const jobs = res.body.jobs || [];
      if (jobs.length === 0) {
        // Not a silent skip: say so, so an empty sandbox is never mistaken for a pass.
        cy.log('SKIPPED: customer A has no jobs with photos — seed one to cover the IDOR path');
        return;
      }
      const aJobId = jobs[0].id;
      api(TOKEN_B, 'photos', `&jobId=${aJobId}`).then((r) => {
        expect(r.status, "B requesting A's job").to.eq(404);
        expect(r.body.photos, 'no photos may come back with the 404').to.be.undefined;
      });
    });
  });

  it('rejects a missing, malformed, or unknown token', () => {
    cy.request({ url: '/api/portal?action=invoices', failOnStatusCode: false })
      .its('status').should('eq', 401);
    cy.request({
      url: '/api/portal?action=invoices',
      headers: { 'x-portal-token': 'short' },
      failOnStatusCode: false,
    }).its('status').should('eq', 401);
    cy.request({
      url: '/api/portal?action=invoices',
      headers: { 'x-portal-token': 'f'.repeat(96) },
      failOnStatusCode: false,
    }).its('status').should('eq', 401);
  });
});
