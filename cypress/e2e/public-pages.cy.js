/**
 * Smoke E2E for the public, unauthenticated surface — the pages a prospect or
 * trial signup hits before logging in. These assert each page renders its key
 * structural elements (not exact copy, which is i18n-driven), so they survive
 * wording changes but still catch a blank-screen / crashed-route regression.
 *
 * Run against local dev (`npm run dev`) or a deployed URL:
 *   npx cypress run --spec cypress/e2e/public-pages.cy.js
 *   npx cypress run --config baseUrl=https://sandbox--<site>.netlify.app
 */

describe('Public marketing pages', () => {
  it('home page renders and links to pricing', () => {
    cy.visit('/');
    cy.contains('ToolTime Pro').should('be.visible');
    // Every marketing page should offer a path to pricing / signup.
    cy.get('a[href*="pricing"], a[href*="signup"]').should('exist');
  });

  it('pricing page renders plan content', () => {
    cy.visit('/pricing');
    // Pricing is the money page — at minimum a dollar figure must render.
    cy.contains(/\$\d/).should('be.visible');
  });

  it('Jenny AI page renders', () => {
    cy.visit('/jenny');
    cy.contains(/Jenny/i).should('be.visible');
  });

  it('SMS / 2FA opt-in page renders', () => {
    cy.visit('/sms');
    cy.get('body').should('be.visible');
    cy.contains(/SMS|text|message/i).should('exist');
  });
});

describe('Free tools (lead magnets)', () => {
  const tools = [
    '/tools',
    '/tools/calculator',
    '/tools/classification',
    '/tools/checklist',
    '/tools/final-wage',
  ];

  tools.forEach((path) => {
    it(`renders ${path}`, () => {
      cy.visit(path);
      // Tool pages are interactive — assert at least one input/button exists.
      cy.get('input, select, button').should('exist');
    });
  });
});

describe('Auth entry points', () => {
  it('login page renders a usable form', () => {
    cy.visit('/auth/login');
    cy.get('input[type="email"], input[name="email"]').should('be.visible');
    cy.get('input[type="password"], input[name="password"]').should('exist');
    // Don't assert button copy — it's i18n-driven. Just confirm a submit exists.
    cy.get('form button, button[type="submit"]').should('exist');
  });

  it('signup page renders all account fields', () => {
    cy.visit('/auth/signup');
    cy.get('input[name="fullName"]').should('be.visible');
    cy.get('input[name="companyName"]').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
  });

  it('signup form is fillable (without submitting)', () => {
    // Verifies the client-side form wiring without creating a real account /
    // polluting the database. Submitting end-to-end needs a seeded teardown
    // and is left to manual / human-in-the-loop testing.
    cy.visit('/auth/signup');
    cy.get('input[name="fullName"]').type('Smoke Test');
    cy.get('input[name="companyName"]').type('Smoke Test Co');
    cy.get('input[name="email"]').type('smoke-test@example.com');
    cy.get('input[name="fullName"]').should('have.value', 'Smoke Test');
    cy.get('input[name="email"]').should('have.value', 'smoke-test@example.com');
  });

  it('forgot-password page renders', () => {
    cy.visit('/auth/forgot-password');
    cy.get('input[type="email"], input[name="email"]').should('be.visible');
  });
});

describe('Competitor comparison pages (SEO)', () => {
  ['/compare', '/compare/jobber', '/compare/housecall-pro'].forEach((path) => {
    it(`renders ${path}`, () => {
      cy.visit(path);
      cy.contains('ToolTime Pro').should('exist');
    });
  });
});
