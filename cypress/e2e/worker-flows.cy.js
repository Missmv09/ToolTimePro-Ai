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

// The timeclock has THREE action states, not two, and only one action button
// is mounted at a time:
//
//   clocked out            → CLOCK IN
//   clocked in             → CLOCK OUT
//   clocked in + on break  → END BREAK   (neither clock button is in the DOM)
//
// Until the page resolves its clock state it renders a bare spinner with no
// button at all, and while a write is in flight every label reads "Please
// wait...". So: wait for a real label, then walk whatever state we found back
// to clocked out. This spec shares its worker account with manual sandbox
// smoke-testing and retries itself up to 3×, so it cannot assume how the
// account was left — an unhandled on-break state wedges it permanently.
const CLOCK_IN = /clock in/i;
const CLOCK_OUT = /clock out/i;
const END_BREAK = /end break/i;
const ANY_ACTION = /clock in|clock out|end break/i;

function resetToClockedOut() {
  // 40s, not the usual 20: the /worker routes are warmed by e2e.yml but the
  // sandbox can still be cold here, and this gate covers auth + the users row +
  // the open time_entry lookup before any button mounts.
  cy.contains('button', ANY_ACTION, { timeout: 40000 })
    .should('be.visible')
    .invoke('text')
    .then((label) => {
      if (END_BREAK.test(label)) {
        cy.contains('button', END_BREAK).click();
        cy.contains('button', CLOCK_OUT, { timeout: 20000 }).should('be.visible').click();
      } else if (CLOCK_OUT.test(label)) {
        cy.contains('button', CLOCK_OUT).click();
      }
    });

  // Whichever branch ran, the flow under test starts from here.
  cy.contains('button', CLOCK_IN, { timeout: 20000 }).should('be.visible');
}

(hasWorker ? describe : describe.skip)('Worker app flows', () => {
  let alerts = [];

  beforeEach(() => {
    alerts = [];
    cy.on('window:alert', (msg) => alerts.push(msg));
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

    resetToClockedOut();

    // Clock in → the button flips to Clock Out → clock back out → flips back.
    cy.contains('button', CLOCK_IN, { timeout: 20000 }).should('be.visible').click();
    cy.contains('button', CLOCK_OUT, { timeout: 20000 }).should('be.visible').click();
    cy.contains('button', CLOCK_IN, { timeout: 20000 }).should('be.visible');

    // The page reports write failures through window.alert, which Cypress stubs
    // and swallows. Without this the DB error behind a failed clock-in surfaces
    // only as "timed out retrying" 20 seconds later, naming the wrong cause.
    cy.then(() => {
      expect(alerts, 'timeclock reported no errors').to.deep.equal([]);
    });
  });
});
