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
    // Successful login lands somewhere under /dashboard.
    cy.location('pathname', { timeout: 25000 }).should('include', '/dashboard');
  });
});
