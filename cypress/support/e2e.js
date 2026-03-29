// Global Cypress support file
// Add custom commands and global before/after hooks here

Cypress.on('uncaught:exception', () => {
  // Prevent Cypress from failing tests on uncaught app exceptions
  // (e.g. Next.js hydration errors in dev mode)
  return false;
});
