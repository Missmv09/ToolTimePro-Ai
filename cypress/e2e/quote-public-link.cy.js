/**
 * TC-QUOTE-02 — Send quote to customer / public quote link renders (P0).
 *
 * Creates a quote, marks it "Sent" (via the row status dropdown — a DB-only
 * update, so NO customer email/SMS is fired from the sandbox), then opens its
 * public `/quote/[id]` link and asserts the customer page renders with the
 * correct total. Self-cleans (deletes the quote and the customer it created).
 *
 * The public quote API 404s for draft/pending quotes by design, which is why
 * the status must be advanced to "Sent" before the public link is viewable.
 *
 * Skips unless E2E_EMAIL / E2E_PASSWORD are set (same as the other authed specs).
 */

const hasCreds = !!Cypress.env('E2E_EMAIL') && !!Cypress.env('E2E_PASSWORD');

(hasCreds ? describe : describe.skip)('TC-QUOTE-02: public quote link', () => {
  beforeEach(() => {
    cy.login();
  });

  it('a sent quote renders on its public /quote/[id] page with the right total', () => {
    const uid = `e2e-${Date.now()}-${Cypress._.random(1e9)}`;
    const name = `E2E QPublic ${uid}`;
    const QTY = 2;
    const PRICE = 100;
    const TOTAL = '$217.50'; // 2 * 100 + 8.75% tax

    // ── Create a quote attached to a brand-new customer (no seed dependency) ──
    cy.visit('/dashboard/quotes');
    cy.location('pathname', { timeout: 25000 }).should('include', '/dashboard/quotes');
    cy.contains('button', /new quote/i, { timeout: 20000 }).click();
    cy.contains(/quick quote/i, { timeout: 10000 }).click();

    cy.get('.fixed.inset-0', { timeout: 10000 }).within(() => {
      cy.get('select').first().select('__new__');
      cy.contains('New Customer Info').should('be.visible');
      cy.get('input[placeholder="John Smith"]').clear().type(name);
      cy.get('input[placeholder="john@email.com"]').clear().type(`${uid}@example.com`);
      cy.get('input[placeholder="Description"]').first().clear().type('E2E line item');
      cy.get('input[placeholder="Qty"]').first().type(`{selectall}${QTY}`).should('have.value', `${QTY}`);
      cy.get('input[placeholder="Price"]').first().type(`{selectall}${PRICE}`).should('have.value', `${PRICE}`);
      cy.contains(TOTAL).should('be.visible');
      cy.contains('button', /^\s*save quote\s*$/i).click();
    });

    // ── Advance status to "Sent" (DB-only; does not email the customer) ───────
    cy.contains('tr', name, { timeout: 25000 }).should('exist');
    cy.contains('tr', name).within(() => {
      cy.get('select').select('Sent');
    });

    // ── Open the public link and assert it renders the quote ─────────────────
    cy.contains('tr', name)
      .find('a[href*="/quote/"]')
      .invoke('attr', 'href')
      .then((href) => {
        expect(href, 'public quote href').to.match(/\/quote\//);
        cy.visit(href);
        // Not the Not-Found state, and shows the quote's total + an approve action.
        cy.contains(/Quote Not Found/i).should('not.exist');
        cy.contains(TOTAL, { timeout: 20000 }).should('be.visible');
        cy.contains(/Sign & Approve|Approve Quote|Decline/i).should('be.visible');
      });

    // ── Cleanup: delete the quote, then the customer it created ──────────────
    cy.on('window:confirm', () => true);
    cy.visit('/dashboard/quotes');
    cy.contains('tr', name, { timeout: 25000 }).within(() => {
      cy.contains('button', /^\s*delete\s*$/i).click();
    });
    cy.contains('tr', name).should('not.exist');

    cy.visit('/dashboard/customers');
    cy.get('input[placeholder*="Search customers"]', { timeout: 20000 }).clear().type(name);
    cy.contains(name).should('be.visible');
    cy.contains('button', /^\s*delete\s*$/i).click();
    cy.contains(name).should('not.exist');
  });
});
