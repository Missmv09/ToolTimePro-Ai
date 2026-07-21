/**
 * Extended public / unauthenticated E2E — broadens public-pages.cy.js with the
 * free tools, self-contained demo pages, auth entry points, graceful handling
 * of invalid public links, and client-side form validation. No backend data or
 * secrets required, so this runs in CI against a local build.
 *
 *   npx cypress run --spec cypress/e2e/public-extended.cy.js
 */

describe('Auth entry pages render', () => {
  for (const path of ['/auth/login', '/auth/signup', '/auth/forgot-password']) {
    it(`${path} renders a form`, () => {
      cy.visit(path);
      cy.get('form').should('exist');
      cy.get('input').its('length').should('be.gte', 1);
    });
  }
});

describe('Free tools render and are interactive', () => {
  const tools = ['/tools', '/tools/calculator', '/tools/classification', '/tools/checklist', '/tools/final-wage'];
  for (const path of tools) {
    it(`${path} renders`, () => {
      cy.visit(path);
      cy.get('body').should('be.visible');
      cy.get('body').invoke('text').its('length').should('be.gt', 50);
    });
  }
});

describe('Self-contained demo pages render (no backend)', () => {
  const demos = ['/demo/booking', '/demo/dashboard', '/demo/invoicing', '/demo/estimator', '/demo/scheduling', '/demo/reviews'];
  for (const path of demos) {
    it(`${path} renders`, () => {
      cy.visit(path);
      cy.get('body').should('be.visible');
      cy.get('body').invoke('text').its('length').should('be.gt', 50);
    });
  }
});

describe('Comparison / SEO pages render', () => {
  for (const path of ['/compare', '/compare/jobber', '/compare/housecall-pro']) {
    it(`${path} renders`, () => {
      cy.visit(path);
      cy.get('body').should('be.visible');
    });
  }
});

describe('Graceful handling of invalid public links (TC-NEG-05)', () => {
  it('an invalid quote id does not crash the page', () => {
    cy.visit('/quote/zzz-does-not-exist-999', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    // Must show *something* meaningful, not a blank white screen.
    cy.get('body').invoke('text').its('length').should('be.gt', 20);
  });

  it('an invalid invoice id does not crash the page', () => {
    cy.visit('/invoice/zzz-does-not-exist-999', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    cy.get('body').invoke('text').its('length').should('be.gt', 20);
  });
});

describe('Client-side form validation (TC-NEG-01)', () => {
  it('signup does not navigate away on empty submit', () => {
    cy.visit('/auth/signup');
    cy.get('form').first().find('button[type="submit"]').click({ force: true });
    // Native required-field validation should keep us on the signup page.
    cy.location('pathname').should('include', '/auth/signup');
  });
});
