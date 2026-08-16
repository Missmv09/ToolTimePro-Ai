/**
 * E2E for the self-contained booking demo (`/demo/booking`). This is the flow
 * a prospect clicks through to "feel" online booking — it runs entirely
 * client-side with hardcoded demo services, so it needs no database or auth and
 * is safe to run against any deploy. It is part of the always-on public E2E
 * gate (.github/workflows/e2e.yml), so CI verifies this on every push.
 *
 * We drive the real multi-step funnel (service -> date -> time -> info ->
 * confirm -> success). Step transitions are anchored on `data-testid`s added to
 * the wizard (booking-service / booking-date / booking-time / booking-review /
 * booking-confirm / booking-success) so the flow does not depend on translated
 * copy. Form fields are matched by their hardcoded placeholders.
 */

describe('Booking demo funnel', () => {
  beforeEach(() => {
    cy.visit('/demo/booking');
  });

  it('renders the demo business and its services', () => {
    cy.contains('Green Scene Landscaping').should('be.visible');
    cy.contains('Lawn Mowing & Edging').should('be.visible');
    cy.contains('Full Landscaping Service').should('be.visible');
  });

  it('selecting a service advances to date & time selection', () => {
    cy.get('[data-testid="booking-service"]').first().click();
    // Selectable dates now render.
    cy.get('[data-testid="booking-date"]').should('have.length.greaterThan', 0);
  });

  it('completes the full funnel through to booking confirmation', () => {
    // Step 1 — service
    cy.get('[data-testid="booking-service"]').first().click();

    // Step 2 — first available date, then the first bookable (non-booked) time
    cy.get('[data-testid="booking-date"]').first().click();
    cy.get('[data-testid="booking-time"][data-booked="false"]').first().click();

    // Step 3 — customer info (placeholders are hardcoded, not translated)
    cy.get('input[placeholder="John Smith"]').type('E2E Tester');
    cy.get('input[placeholder="john@example.com"]').type('e2e@example.com');
    cy.get('input[placeholder="(555) 123-4567"]').type('5551234567');
    cy.get('input[placeholder="123 Main Street"]').type('123 Test St');
    cy.get('input[placeholder="Los Angeles"]').type('Testville');
    cy.get('input[placeholder="CA"]').type('CA');
    cy.get('input[placeholder="90001"]').type('90001');
    cy.get('[data-testid="booking-review"]').click();

    // Step 4 — confirm; the demo simulates a ~1.5s API call before success.
    cy.get('[data-testid="booking-confirm"]').click();

    // Step 5 — success screen, with the entered email echoed back.
    cy.get('[data-testid="booking-success"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="booking-success"]').contains('e2e@example.com').should('exist');
  });
});
