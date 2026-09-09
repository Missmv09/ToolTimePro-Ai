/**
 * TC-X-01 — Multi-tenant isolation (P0, security).
 *
 * Confirms one company cannot see another company's data (Supabase RLS): a
 * customer created by Company A must NOT be visible when logged in as Company B.
 *
 * Needs TWO sandbox company accounts. Provide, in addition to the usual
 * E2E_EMAIL / E2E_PASSWORD (Company A), a second company's login as
 * E2E_EMAIL_2 / E2E_PASSWORD_2 (add them as GitHub Actions secrets, same as the
 * first pair). The whole suite SKIPS until all four are present, so it never
 * breaks CI before the second account exists.
 *
 *   Company A = E2E_EMAIL / E2E_PASSWORD
 *   Company B = E2E_EMAIL_2 / E2E_PASSWORD_2   (a DIFFERENT company on the sandbox)
 *
 * IMPORTANT: Company B must have COMPLETED ONBOARDING. The dashboard hard-
 * redirects any company with onboarding_completed = false to /onboarding, so a
 * brand-new signup can't reach /dashboard/customers for the isolation check.
 * Mark it complete once in the sandbox Supabase SQL editor:
 *
 *   update companies set onboarding_completed = true
 *   where email = '<company B signup email>';
 */

const A = { email: Cypress.env('E2E_EMAIL'), password: Cypress.env('E2E_PASSWORD') };
const B = { email: Cypress.env('E2E_EMAIL_2'), password: Cypress.env('E2E_PASSWORD_2') };
const hasBothCompanies = !!A.email && !!A.password && !!B.email && !!B.password;

// Log in as a specific company, cached per-email via cy.session so switching
// between the two accounts restores the correct cookies/localStorage cleanly.
function loginAs(email, password) {
  cy.session(['tc-x-01', email], () => {
    cy.visit('/auth/login');
    cy.get('input[name="email"]').clear().type(email);
    cy.get('input[name="password"]').clear().type(password, { log: false });
    cy.get('input[name="password"]').parents('form').first().find('button[type="submit"]').click();
    // A fresh company lands on /onboarding; an established one on /dashboard.
    // Accept either — we only need to be logged in (off /auth/login). Company B
    // must be onboarding-complete (see the header note) so it can reach the
    // dashboard for the isolation assertion below.
    //
    // Assert against the page, not just the URL, so a failure says WHY (same
    // reasoning as cy.login() in support/commands.js): a bare URL assertion
    // reads "expected '/auth/login/' to match ..." and cannot tell a rejected
    // password from a 2FA prompt from a request that never came back. It also
    // says WHICH account, because this spec logs in as two of them.
    cy.get('body', { timeout: 45000 }).should(($body) => {
      const { pathname } = $body[0].ownerDocument.location;
      if (/\/(dashboard|onboarding)/.test(pathname)) return;

      const alert = $body.find('.bg-red-50, [role="alert"]').first().text().trim();
      const needs2fa = $body.find('#twofa-code').length > 0;
      throw new Error(
        `Login as ${email} did not reach /dashboard or /onboarding — still at ${pathname}.`
        + (needs2fa
          ? ' The app is asking for a 2FA code, so this account cannot log in unattended:'
            + ' disable 2FA for it (users.two_fa_enabled), or mark the CI device as trusted.'
          : '')
        + (alert
          ? ` The page is showing: "${alert}".`
          : ' The page is showing no error, so the login chain is still in flight'
            + ' or a request timed out (check the deployment is warm and finished publishing).')
      );
    });
  });
}

(hasBothCompanies ? describe : describe.skip)('TC-X-01: multi-tenant isolation (RLS)', () => {
  it('Company B cannot see a customer created by Company A', () => {
    const uid = `e2e-iso-${Date.now()}-${Cypress._.random(1e9)}`;
    const name = `E2E Isolation ${uid}`;
    const custEmail = `${uid}@example.com`;

    // ── Company A creates a uniquely-named customer ──────────────────────────
    loginAs(A.email, A.password);
    cy.visit('/dashboard/customers');
    cy.contains('button', /add (your first )?customer/i, { timeout: 20000 }).first().click();
    cy.contains(/Add New Customer/i, { timeout: 10000 }).should('be.visible');
    cy.get('.fixed.inset-0').within(() => {
      // The modal disables its inputs while it loads company data on a cold
      // function; wait for the first field to enable before typing, or cy.type()
      // fails "targeted a disabled element". Once it's enabled the rest are too.
      cy.get('input[type="text"]').first().should('not.be.disabled').clear().type(name);
      cy.get('input[type="email"]').first().clear().type(custEmail);
      cy.get('input[type="tel"]').first().clear().type('5551234567');
      cy.contains('button', /save customer|save|add|create/i).click();
    });
    cy.contains(name, { timeout: 20000 }).should('exist');

    // ── Company B must NOT see it (the isolation assertion) ──────────────────
    loginAs(B.email, B.password);
    cy.visit('/dashboard/customers');
    // Guard against a false pass: confirm B's own customers page actually loaded
    // (search box present) before asserting the absence of A's record.
    cy.searchCustomers(name);
    cy.contains(name).should('not.exist');

    // ── Cleanup: Company A deletes the customer ──────────────────────────────
    loginAs(A.email, A.password);
    cy.visit('/dashboard/customers');
    cy.on('window:confirm', () => true);
    cy.searchCustomers(name);
    cy.contains(name, { timeout: 20000 }).should('be.visible');
    cy.contains('button', /^\s*delete\s*$/i).click();
    cy.contains(name).should('not.exist');
  });
});
