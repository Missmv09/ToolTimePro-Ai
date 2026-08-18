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
  });
});
