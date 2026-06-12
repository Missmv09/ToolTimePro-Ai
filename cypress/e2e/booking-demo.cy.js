/**
 * E2E for the self-contained booking demo (`/demo/booking`). This is the flow
 * a prospect clicks through to "feel" online booking — it runs entirely
 * client-side with hardcoded demo services, so it needs no database or auth and
 * is safe to run against any deploy.
 *
 * We drive the real multi-step funnel (service -> date -> time -> customer info)
 * and assert on stable, hardcoded anchors (service names, input placeholders)
 * rather than i18n copy. The final submit -> success step is intentionally left
 * to manual testing: its button labels are translated and the success state
 * depends on demo slot availability, both of which make it flaky in CI.
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
    cy.contains('Full Landscaping Service').click();

    // The chosen service is echoed back on the scheduling step.
    cy.contains('Full Landscaping Service').should('be.visible');
    // At least one selectable date (rendered with a month abbreviation) appears.
    cy.get('button')
      .contains(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
      .should('be.visible');
  });

  it('walks from service through to the customer info form', () => {
    // Step 1 — service
    cy.contains('Full Landscaping Service').click();

    // Step 2 — pick the first available date
    cy.get('button')
      .contains(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)
      .first()
      .click();

    // Step 2b — pick the first time slot that isn't already booked
    cy.get('button:not([disabled])')
      .contains(/\d{1,2}:\d{2}/)
      .first()
      .click();

    // Step 3 — selecting a time advances to the customer info form
    cy.get('input[placeholder="John Smith"]').should('be.visible');
    cy.get('input[placeholder="john@example.com"]').should('be.visible');
  });
});
