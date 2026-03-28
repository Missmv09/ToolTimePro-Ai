/**
 * E2E tests for the customer-facing quote portal.
 *
 * These tests use the built-in demo quote (id: "demo") so they run without
 * a database or API backend.  Start the dev server (`npm run dev`) before
 * running: `npx cypress run --spec cypress/e2e/customer-portal.cy.js`
 */

describe('Customer Quote Portal – demo quote', () => {
  beforeEach(() => {
    cy.visit('/quote/demo');
  });

  // ── Page load & content ─────────────────────────────────────────────────

  it('renders the demo quote with company and customer details', () => {
    cy.contains('Green Valley Landscaping').should('be.visible');
    cy.contains('John Smith').should('be.visible');
    cy.contains('$303.10').should('be.visible');
  });

  it('displays all line items', () => {
    cy.contains('Front yard lawn mowing').should('be.visible');
    cy.contains('Hedge trimming').should('be.visible');
    cy.contains('Edge trimming').should('be.visible');
    cy.contains('Gutter cleaning').should('be.visible');
    cy.contains('Yard debris cleanup').should('be.visible');
  });

  it('shows the quote notes section', () => {
    cy.contains('Work will be completed within 1-2 business days').should('be.visible');
  });

  // ── Approval flow ───────────────────────────────────────────────────────

  it('opens signature modal and approves the quote', () => {
    // Click sign & approve
    cy.contains('Sign & Approve').click();

    // Signature modal should appear
    cy.contains('Sign to Approve').should('be.visible');

    // Draw a simple signature on the canvas
    cy.get('canvas').then(($canvas) => {
      const canvas = $canvas[0];
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + 50;
      const y = rect.top + 40;

      cy.wrap($canvas)
        .trigger('mousedown', { clientX: x, clientY: y })
        .trigger('mousemove', { clientX: x + 80, clientY: y + 10 })
        .trigger('mouseup');
    });

    // Save the signature
    cy.contains('Save').click();

    // Now approve
    cy.contains('Approve Quote').click();

    // Should show success
    cy.contains('Quote Approved!').should('be.visible');

    // Action buttons should disappear
    cy.contains('Sign & Approve').should('not.exist');
    cy.contains('Decline').should('not.exist');
  });

  // ── Rejection flow ──────────────────────────────────────────────────────

  it('declines the quote with a reason', () => {
    cy.contains('Decline').click();

    // Reason picker should appear
    cy.contains('Why are you declining?').should('be.visible');

    // Select a reason
    cy.contains('Price too high').click();

    // Confirm decline
    cy.contains('Decline Quote').click();

    // Should show declined message
    cy.contains('Quote Declined').should('be.visible');
    cy.contains('Price too high').should('be.visible');
  });

  it('cancels the decline flow and returns to action buttons', () => {
    cy.contains('Decline').click();
    cy.contains('Why are you declining?').should('be.visible');

    cy.contains('Cancel').click();

    // Action buttons should return
    cy.contains('Sign & Approve').should('be.visible');
    cy.contains('Decline').should('be.visible');
  });

  // ── Not-found quote ─────────────────────────────────────────────────────

  it('shows not-found page for an invalid quote ID', () => {
    cy.visit('/quote/nonexistent-id-12345', { failOnStatusCode: false });
    cy.contains('Quote Not Found').should('be.visible');
  });
});
