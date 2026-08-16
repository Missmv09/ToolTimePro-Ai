/**
 * E2E for the public customer quote portal (`/quote/[id]`).
 *
 * NOTE: the public quote API enforces UUID-only lookups as an anti-enumeration
 * measure (see src/app/api/quote/public/route.ts), so the old self-contained
 * "/quote/demo" fixture no longer exists — any non-UUID or unknown id renders
 * the Not Found state. These tests validate that real, current behavior.
 *
 * The interactive approve / decline / signature flow needs a real seeded quote
 * (a valid UUID in sent/viewed/approved state) and cannot run against a static
 * demo fixture anymore. That flow is covered by the manual test matrix in
 * docs/QA_TESTING_GUIDE.md §3 (Public quote → approve/decline). If we later seed
 * a stable sandbox quote, we can add an E2E that visits its real URL.
 */

describe('Customer Quote Portal – public access', () => {
  it('shows the Not Found state for a non-UUID id (the retired /quote/demo)', () => {
    cy.visit('/quote/demo', { failOnStatusCode: false });
    cy.contains('Quote Not Found', { timeout: 15000 }).should('be.visible');
  });

  it('shows the Not Found state for an unknown quote id', () => {
    cy.visit('/quote/nonexistent-id-12345', { failOnStatusCode: false });
    cy.contains('Quote Not Found', { timeout: 15000 }).should('be.visible');
  });
});
