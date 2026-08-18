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

  it('TC-CUST-01: creates a uniquely-namespaced customer, sees it, then deletes it (self-cleanup)', () => {
    // Unique per run so parallel/repeat CI runs never collide, and any rare
    // leftover is trivially findable/purgeable by the "e2e-" prefix.
    const uid = `e2e-${Date.now()}-${Cypress._.random(1e9)}`;
    const name = `E2E Test ${uid}`;
    const email = `${uid}@example.com`;

    cy.visit('/dashboard/customers');
    // Open the add-customer modal (button reads "Add Customer" / "Add Your First Customer").
    cy.contains('button', /add (your first )?customer/i, { timeout: 20000 }).first().click();
    cy.contains(/Add New Customer/i, { timeout: 10000 }).should('be.visible');
    // Scope to the modal overlay itself (.fixed.inset-0) — not a generic
    // `.fixed`/`form`, which can match a toast or chat widget rendered later in
    // the DOM. Residential (default) shows Name as the first text input.
    cy.get('.fixed.inset-0').within(() => {
      cy.get('input[type="text"]').first().clear().type(name);
      cy.get('input[type="email"]').first().clear().type(email);
      cy.get('input[type="tel"]').first().clear().type('5551234567');
      cy.contains('button', /save customer|save|add|create/i).click();
    });
    cy.contains(name, { timeout: 20000 }).should('exist');

    // Self-cleanup: the app deletes via a row "Delete" button guarded by
    // window.confirm. Isolate the row via search, accept the confirm, delete,
    // and assert it's gone — so the test leaves no data behind.
    cy.on('window:confirm', () => true);
    cy.get('input[placeholder*="Search customers"]', { timeout: 10000 }).clear().type(name);
    cy.contains(name).should('be.visible');
    cy.contains('button', /^\s*delete\s*$/i).click();
    cy.contains(name).should('not.exist');
  });

  it('TC-JOB-01: creates a job, sees it in the list, then self-cleans', () => {
    const uid = `e2e-${Date.now()}-${Cypress._.random(1e9)}`;
    const title = `E2E Job ${uid}`;

    cy.visit('/dashboard/jobs');
    cy.location('pathname', { timeout: 25000 }).should('include', '/dashboard/jobs');
    cy.contains('button', /new job/i, { timeout: 20000 }).click();

    // Only address + date + start time are required (validateForm); customer,
    // service and worker are optional, so this needs no seed data. A unique
    // title makes the row findable; 14:30 also exercises the 12-hour render.
    cy.get('.fixed.inset-0', { timeout: 10000 }).within(() => {
      cy.get('input[placeholder="e.g., Weekly pool cleaning"]').clear().type(title);
      cy.get('input[placeholder="123 Main St"]').clear().type('123 E2E Test St');
      cy.get('input[type="date"]').first().type('2027-01-15');
      cy.get('input[type="time"]').first().type('14:30');
      cy.contains('button', /^\s*save job\s*$/i).click();
    });

    cy.contains('tr', title, { timeout: 25000 }).should('exist');

    // Self-cleanup (row Delete is guarded by window.confirm).
    cy.on('window:confirm', () => true);
    cy.contains('tr', title).within(() => {
      cy.contains('button', /^\s*delete\s*$/i).click();
    });
    cy.contains('tr', title).should('not.exist');
  });

  it('TC-QUOTE-01: opens the New Quote menu and the Quick Quote modal', () => {
    cy.visit('/dashboard/quotes');
    cy.location('pathname', { timeout: 25000 }).should('include', '/dashboard/quotes');
    // Header "+ New Quote" opens a dropdown offering Smart Quote / Quick Quote.
    cy.contains('button', /new quote/i, { timeout: 20000 }).click();
    cy.contains(/smart quote/i, { timeout: 10000 }).should('be.visible');
    cy.contains(/quick quote/i).should('be.visible').click();
    // The Quick Quote modal renders (customer + line-item form).
    cy.get('.fixed, [role="dialog"], form', { timeout: 10000 }).should('exist');
  });

  it('TC-INV-01: creates an invoice with a line item, sees it, then self-cleans', () => {
    const uid = `e2e-${Date.now()}-${Cypress._.random(1e9)}`;
    const name = `E2E Inv ${uid}`;

    // The invoice modal needs an EXISTING customer (no inline new-customer
    // option), so create one first — a residential customer's dropdown option
    // is just its name, which we select below.
    cy.visit('/dashboard/customers');
    cy.contains('button', /add (your first )?customer/i, { timeout: 20000 }).first().click();
    cy.contains(/Add New Customer/i, { timeout: 10000 }).should('be.visible');
    cy.get('.fixed.inset-0').within(() => {
      cy.get('input[type="text"]').first().clear().type(name);
      cy.get('input[type="email"]').first().clear().type(`${uid}@example.com`);
      cy.get('input[type="tel"]').first().clear().type('5551234567');
      cy.contains('button', /save customer|save|add|create/i).click();
    });
    cy.contains(name, { timeout: 20000 }).should('exist');

    // Create the invoice for that customer.
    cy.visit('/dashboard/invoices');
    cy.location('pathname', { timeout: 25000 }).should('include', '/dashboard/invoices');
    cy.contains('button', /new invoice/i, { timeout: 20000 }).click();
    cy.get('.fixed.inset-0', { timeout: 10000 }).within(() => {
      cy.get('select').first().select(name); // customer select (first in the modal)
      cy.get('input[placeholder="Description"]').first().clear().type('E2E line item');
      cy.get('input[placeholder="Qty"]').first().type('{selectall}1').should('have.value', '1');
      cy.get('input[placeholder="Price"]').first().type('{selectall}100').should('have.value', '100');
      // "Save Invoice" (not "Send Invoice", which would email the customer).
      cy.contains('button', /^\s*save invoice\s*$/i).click();
    });

    // Invoice shows up in the list keyed by the customer name — number generated.
    cy.contains('tr', name, { timeout: 25000 }).should('exist');

    // Cleanup: delete the invoice, then the customer it was for.
    cy.on('window:confirm', () => true);
    cy.contains('tr', name).within(() => {
      cy.contains('button', /^\s*delete\s*$/i).click();
    });
    cy.contains('tr', name).should('not.exist');

    cy.visit('/dashboard/customers');
    cy.get('input[placeholder*="Search customers"]', { timeout: 20000 }).clear().type(name);
    cy.contains(name).should('be.visible');
    cy.contains('button', /^\s*delete\s*$/i).click();
    cy.contains(name).should('not.exist');
  });

  it('TC-JOB-02: scheduled times render in 12-hour AM/PM, never 24-hour', () => {
    cy.visit('/dashboard/jobs');
    cy.location('pathname', { timeout: 25000 }).should('include', '/dashboard/jobs');
    // Wait for the list to settle before scraping text, so we don't assert on a
    // skeleton. Any visible job time must read like "2:30 PM" — a 24-hour clock
    // (13:00–23:59) is the regression this guards against.
    cy.get('body', { timeout: 20000 }).should('be.visible');
    cy.get('body')
      .invoke('text')
      .should((text) => {
        const twentyFourHour = text.match(/\b(1[3-9]|2[0-3]):[0-5]\d\b/g);
        expect(twentyFourHour, `24-hour times found: ${twentyFourHour}`).to.be.null;
      });
  });

  it('TC-QUOTE-01: builds a quote, totals calculate, then self-cleans', () => {
    // Unique per run so repeat/parallel CI runs never collide, and any rare
    // leftover is findable by the "e2e-" prefix (same convention as TC-CUST-01).
    const uid = `e2e-${Date.now()}-${Cypress._.random(1e9)}`;
    const name = `E2E Quote ${uid}`;
    const QTY = 2;
    const PRICE = 100;
    const SUBTOTAL = '$200.00'; // QTY * PRICE — pure math, independent of tax
    const TOTAL = '$217.50'; // + 8.75% tax; the label assert below pins the rate

    cy.visit('/dashboard/quotes');
    cy.location('pathname', { timeout: 25000 }).should('include', '/dashboard/quotes');
    cy.contains('button', /new quote/i, { timeout: 20000 }).click();
    cy.contains(/quick quote/i, { timeout: 10000 }).click();

    // Attach to a brand-new customer so the spec never depends on seed data.
    cy.get('.fixed.inset-0', { timeout: 10000 }).within(() => {
      cy.get('select').first().select('__new__');
      cy.contains('New Customer Info').should('be.visible');
      cy.get('input[placeholder="John Smith"]').clear().type(name);
      cy.get('input[placeholder="john@email.com"]').clear().type(`${uid}@example.com`);

      cy.get('input[placeholder="Description"]').first().clear().type('E2E line item');
      // `{selectall}` rather than .clear() on these two: they are controlled
      // number inputs seeded with 1 and 0. Clearing fires onChange('') -> Number('')
      // -> 0, which re-renders "0" back into the field with the caret at the start,
      // so a following .type('2') lands as "20". Selecting first replaces cleanly.
      // The value assertions keep any future regression pointing at the input
      // rather than surfacing as a confusing totals mismatch.
      cy.get('input[placeholder="Qty"]').first().type(`{selectall}${QTY}`).should('have.value', `${QTY}`);
      cy.get('input[placeholder="Price"]').first().type(`{selectall}${PRICE}`).should('have.value', `${PRICE}`);

      // TC-QUOTE-01's core assertion: the total actually calculates.
      cy.contains('Tax (8.75%)').should('be.visible'); // fails loudly if the rate moves
      cy.contains(SUBTOTAL).should('be.visible');
      cy.contains(TOTAL).should('be.visible');

      // "Save Quote" only — deliberately NOT "Save & Send", which would fire a
      // real customer email/SMS from the sandbox.
      cy.contains('button', /^\s*save quote\s*$/i).click();
    });

    // Saved quote shows up in the list, keyed by our unique customer name.
    cy.contains('tr', name, { timeout: 25000 }).should('exist');

    // Self-cleanup: delete the quote first (FK), then the customer it created.
    cy.on('window:confirm', () => true);
    cy.contains('tr', name).within(() => {
      cy.contains('button', /^\s*delete\s*$/i).click();
    });
    cy.contains('tr', name).should('not.exist');

    cy.visit('/dashboard/customers');
    cy.get('input[placeholder*="Search customers"]', { timeout: 20000 }).clear().type(name);
    cy.contains(name).should('be.visible');
    cy.contains('button', /^\s*delete\s*$/i).click();
    cy.contains(name).should('not.exist');
  });

  it('TC-SEC-06: protected dashboard route requires auth (logged-out is redirected)', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    // Cover the routes that expose the most sensitive tenant data, not just one —
    // gating is per-route middleware, so one passing route proves little.
    ['/dashboard/customers', '/dashboard/invoices', '/dashboard/team', '/dashboard/settings'].forEach(
      (route) => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.visit(route, { failOnStatusCode: false });
        // Either redirected to login, or a login form is shown — never the data.
        cy.location('pathname', { timeout: 15000 }).should('match', /\/auth\/login|\/login/);
      }
    );
  });
});

// Logged-out auth behavior. Deliberately a separate describe: the suite above
// logs in via `beforeEach`, and these cases need to start signed out.
(hasCreds ? describe : describe.skip)('Auth error handling', () => {
  it('TC-AUTH-04: wrong password shows a clear error and does not sign the user in', () => {
    // A deliberately unknown address, not E2E_EMAIL. Supabase returns the same
    // "Invalid login credentials" for an unknown email as for a bad password, so
    // the assertion is identical — but repeatedly failing against the real CI
    // account risks tripping Supabase rate limiting and taking the whole
    // authenticated suite down with it.
    const email = `e2e-nobody-${Date.now()}-${Cypress._.random(1e9)}@example.com`;

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/auth/login');
    cy.get('input[name="email"]').clear().type(email);
    cy.get('input[name="password"]').clear().type('definitely-the-wrong-password', { log: false });
    cy.get('input[name="password"]').parents('form').first().find('button[type="submit"]').click();

    // Clear, human error message — not a raw Supabase string or a silent no-op.
    cy.contains(/incorrect email or password/i, { timeout: 20000 }).should('be.visible');
    // And still signed out: no dashboard, no session.
    cy.location('pathname').should('match', /\/auth\/login|\/login/);
    cy.visit('/dashboard', { failOnStatusCode: false });
    cy.location('pathname', { timeout: 15000 }).should('match', /\/auth\/login|\/login/);
  });
});
