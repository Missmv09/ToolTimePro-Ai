/**
 * Authenticated E2E — runs against a deployed environment (the sandbox) with a
 * real beta-tester login. These need credentials, so the whole suite SKIPS
 * unless CYPRESS_E2E_EMAIL / CYPRESS_E2E_PASSWORD are provided. Point Cypress at
 * the sandbox:
 *
 *   CYPRESS_E2E_EMAIL=... CYPRESS_E2E_PASSWORD=... \
 *     npx cypress run --spec cypress/e2e/authenticated-flows.cy.js \
 *     --config baseUrl=https://sandbox--lively-yeot-c640cd.netlify.app
 *
 * Start small (login + dashboard + create customer); expand once green in CI.
 */

const hasCreds = !!Cypress.env('E2E_EMAIL') && !!Cypress.env('E2E_PASSWORD');

(hasCreds ? describe : describe.skip)('Authenticated flows', () => {
  beforeEach(() => {
    cy.login();
  });

  it('TC-AUTH-03: lands on the dashboard after login', () => {
    cy.visit('/dashboard');
    cy.location('pathname', { timeout: 25000 }).should('include', '/dashboard');
    cy.get('body').should('be.visible');
  });

  it('TC-CUST-01: creates a customer and sees it in the list', () => {
    const name = `QA Test Customer ${Date.now()}`;
    cy.visit('/dashboard/customers');
    // Open the add-customer modal (button reads "Add Customer" / "Add Your First Customer").
    cy.contains('button', /add (your first )?customer/i, { timeout: 20000 }).first().click();
    cy.contains(/Add New Customer/i, { timeout: 10000 }).should('be.visible');
    // Fill the minimum: a name and a phone (the app says name + phone is enough).
    cy.get('.fixed, [role="dialog"], form').last().within(() => {
      cy.get('input[type="text"]').first().clear().type(name);
      cy.get('input[type="tel"]').first().clear().type('5551234567');
      cy.contains('button', /save|add|create/i).click();
    });
    cy.contains(name, { timeout: 20000 }).should('exist');
  });

  it('TC-JOB-01: opens the jobs page', () => {
    cy.visit('/dashboard/jobs');
    cy.location('pathname').should('include', '/dashboard/jobs');
    cy.get('body').should('be.visible');
  });

  it('TC-SEC-06: protected dashboard route requires auth (logged-out is redirected)', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/dashboard/customers', { failOnStatusCode: false });
    // Either redirected to login, or a login form is shown — never the customer data.
    cy.location('pathname', { timeout: 15000 }).should('match', /\/auth\/login|\/login/);
  });
});
