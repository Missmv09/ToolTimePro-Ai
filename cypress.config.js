const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    // Deployed targets (sandbox / prod) run on Netlify serverless, where the
    // first hit to a page can cold-start well past the default 60s page-load
    // budget. Give cold starts room and auto-retry the resulting flakiness in
    // CI so a cold deploy doesn't read as a real failure.
    pageLoadTimeout: 120000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    retries: { runMode: 2, openMode: 0 },
    video: false,
  },
});
