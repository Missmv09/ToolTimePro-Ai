/**
 * Worker app E2E (TC-WORK-01 / 02 / 04).
 *
 * Needs a sandbox WORKER account (a `worker`-role user attached to a company).
 * The app has no in-UI worker invite, so create one via Supabase Auth and link
 * it to an existing (onboarded) company — see database/TEST_ACCOUNT_SETUP.md
 * ("Adding Test Workers"). Then add its login as GitHub Actions secrets:
 *
 *   E2E_WORKER_EMAIL / E2E_WORKER_PASSWORD
 *
 * The suite SKIPS until both are set, so it never breaks CI before the worker
 * account exists. (TC-WORK-03 "On my way" fires a real SMS and stays manual.)
 */

const worker = {
  email: Cypress.env('E2E_WORKER_EMAIL'),
  password: Cypress.env('E2E_WORKER_PASSWORD'),
};
const hasWorker = !!worker.email && !!worker.password;

function workerLogin() {
  cy.session(['worker', worker.email], () => {
    cy.visit('/worker/login');
    cy.get('input[type="email"]').clear().type(worker.email);
    cy.get('input[type="password"]').clear().type(worker.password, { log: false });
    cy.get('form').find('button[type="submit"]').click();
    // Successful worker login lands under /worker (redirects to /worker/timeclock).
    cy.location('pathname', { timeout: 25000 }).should('include', '/worker');
  });
}

(hasWorker ? describe : describe.skip)('Worker app flows', () => {
  beforeEach(() => {
    workerLogin();
  });

  it('TC-WORK-01: worker logs in and lands in the worker app', () => {
    cy.visit('/worker/timeclock');
    cy.location('pathname', { timeout: 25000 }).should('include', '/worker');
    cy.get('body').should('be.visible');
  });

  it("TC-WORK-02: worker home loads today's jobs with 12-hour times", () => {
    cy.visit('/worker');
    cy.location('pathname', { timeout: 25000 }).should('include', '/worker');
    cy.get('body', { timeout: 20000 }).should('be.visible');
    // Any job time shown must read as AM/PM — a 24-hour clock (13:00–23:59) is
    // the regression this guards against (same check as TC-JOB-02). Vacuously
    // true if no jobs are assigned to this worker yet.
    cy.get('body')
      .invoke('text')
      .should((text) => {
        const twentyFourHour = text.match(/\b(1[3-9]|2[0-3]):[0-5]\d\b/g);
        expect(twentyFourHour, `24-hour times found: ${twentyFourHour}`).to.be.null;
      });
  });

  it('TC-WORK-04: worker can clock in and clock out', () => {
    cy.visit('/worker/timeclock');
    cy.location('pathname', { timeout: 25000 }).should('include', '/worker/timeclock');

    // The timeclock renders ONLY a loading spinner until it fetches the current
    // clock state; a CLOCK IN/OUT button appears only once that resolves. Wait
    // for a button before the reset check below — otherwise that synchronous
    // check runs against the spinner (no buttons yet), skips, and the flow times
    // out whenever a prior attempt left the worker clocked in.
    cy.contains('button', /clock (in|out)/i, { timeout: 25000 }).should('be.visible');

    // Reset to a known CLOCKED-OUT state. Cypress retries this spec up to 3×, and
    // an earlier attempt can leave an open time entry — which renders CLOCK OUT.
    // If so, clock out first so the flow always starts from CLOCK IN. Regex-test
    // the body text (not jQuery :contains) so it's case-insensitive; the "Clocked
    // In" status label doesn't contain the substring "clock out", so this is true
    // only when the CLOCK OUT button is actually present.
    cy.get('body').then(($b) => {
      if (/clock out/i.test($b.text())) {
        cy.contains('button', /clock out/i).click();
        cy.contains('button', /clock in/i, { timeout: 20000 }).should('be.visible');
      }
    });

    // Clock in → the button flips to Clock Out → clock back out → flips back.
    cy.contains('button', /clock in/i, { timeout: 20000 }).should('be.visible').click();
    cy.contains('button', /clock out/i, { timeout: 20000 }).should('be.visible').click();
    cy.contains('button', /clock in/i, { timeout: 20000 }).should('be.visible');
  });
});
