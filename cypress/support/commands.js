// Custom Cypress commands.

// Log in via the real auth form, cached across tests with cy.session.
// Credentials come from Cypress env (CYPRESS_E2E_EMAIL / CYPRESS_E2E_PASSWORD).
Cypress.Commands.add('login', () => {
  const email = Cypress.env('E2E_EMAIL');
  const password = Cypress.env('E2E_PASSWORD');
  if (!email || !password) {
    throw new Error('cy.login() requires CYPRESS_E2E_EMAIL and CYPRESS_E2E_PASSWORD');
  }
  cy.session([email], () => {
    cy.visit('/auth/login');
    cy.get('input[name="email"]').clear().type(email);
    cy.get('input[name="password"]').clear().type(password, { log: false });
    cy.get('input[name="password"]').parents('form').first().find('button[type="submit"]').click();

    // Successful login lands somewhere under /dashboard. Assert against the
    // page rather than the URL alone so a failure says WHY: submitting the form
    // is only the start of the chain (Supabase auth -> /api/auth/2fa/check-device
    // -> the post-login redirect), and every way that chain can break leaves the
    // browser sitting on /auth/login — which as a bare URL assertion reads
    // "expected '/auth/login/' to include '/dashboard'" and names no cause.
    // 45s because that chain includes two serverless round-trips, and the 2FA
    // check fails closed: a cold-start timeout there signs the user back out.
    cy.get('body', { timeout: 45000 }).should(($body) => {
      const { pathname } = $body[0].ownerDocument.location;
      if (pathname.includes('/dashboard')) return;

      const alert = $body.find('.bg-red-50, [role="alert"]').first().text().trim();
      const needs2fa = $body.find('#twofa-code').length > 0;
      throw new Error(
        `Login did not reach /dashboard — still at ${pathname}.`
        + (needs2fa
          ? ' The app is asking for a 2FA code, so the E2E account cannot log in unattended:'
            + ' disable 2FA for it, or mark the CI device as trusted.'
          : '')
        + (alert
          ? ` The page is showing: "${alert}".`
          : ' The page is showing no error, so the login chain is still in flight'
            + ' or a request timed out (check the deployment is warm and finished publishing).')
      );
    });

    // Being AT /dashboard is not the same as SEEING the dashboard. The
    // post-login redirect once raced a router.refresh() and crashed React's
    // commit ("Failed to execute 'removeChild' on 'Node'"); the URL stayed at
    // /dashboard/ while the page showed the "Something went wrong on our end"
    // error boundary, so the URL check above passed on a broken app.
    // Require the dashboard chrome to have rendered, and name the error
    // boundary when it is what rendered instead.
    assertDashboardRendered();
  }, {
    // A cached session that no longer logs in (expired token, account reset,
    // single-session guard kicked it) must be re-created, not trusted.
    validate() {
      cy.visit('/dashboard');
      assertDashboardRendered();
    },
  });
});

/**
 * The signed-in dashboard shell has rendered: the sidebar navigation exists
 * and the segment error boundary is not on screen. Fails with the boundary's
 * own text when that is what the user would be looking at.
 */
function assertDashboardRendered() {
  cy.get('body', { timeout: 45000 }).should(($body) => {
    const text = $body.text();
    if (/Something went wrong on our end/i.test(text)) {
      throw new Error(
        'Login reached /dashboard but the page rendered the error boundary'
        + ' ("Something went wrong on our end") instead of the dashboard.'
      );
    }
    if (/\/auth\/login/.test($body[0].ownerDocument.location.pathname)) {
      throw new Error('Session is no longer signed in: /dashboard bounced to /auth/login.');
    }
    if ($body.find('aside nav a[href^="/dashboard"]').length === 0) {
      throw new Error(
        'Dashboard sidebar navigation has not rendered.'
        + ` Page text: "${text.replace(/\s+/g, ' ').trim().slice(0, 300)}"`
      );
    }
  });
}

/**
 * Type a term into the customers search box.
 *
 * Re-queries before each action instead of chaining off one `cy.get`. The
 * customers list loads asynchronously and React re-renders when the data
 * arrives, which detaches an input grabbed a moment earlier — Cypress reports
 * `cy.clear() failed because the page updated while this command was
 * executing`, and the test fails on all three attempts because the race is
 * timing-dependent, not random.
 *
 * `.should('not.be.disabled')` alone is not enough: it waits for the element
 * found *at that moment* to become enabled, but says nothing about that same
 * element still being attached one command later. Re-querying makes each
 * action retry against the current DOM.
 */
Cypress.Commands.add('searchCustomers', (term) => {
  const SEARCH = 'input[placeholder*="Search customers"]';
  cy.get(SEARCH, { timeout: 20000 }).should('not.be.disabled');
  cy.get(SEARCH).clear();
  cy.get(SEARCH).type(term);
});
