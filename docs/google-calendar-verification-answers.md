# Google OAuth Verification — Ready-to-Submit Answers

Copy-paste these into the Google Cloud OAuth verification form. They are written
to match exactly what Task Iguana's code actually does, which is what the Trust
& Safety reviewers check against the demo video.

---

## Scope requested
`https://www.googleapis.com/auth/calendar.events` — **one scope only.**
(Sensitive, not restricted → standard review, no CASA security audit required.)

> Do **not** request `calendar` (full), `calendar.readonly`, or any other scope.
> Requesting more than you use is the #1 cause of rejection. The code only ever
> calls the events endpoints with `calendar.events`.

---

## "Why does your app need this scope?" (scope justification)

> Task Iguana is a field-service management platform for contractors. When a
> user connects their Google Calendar, we use the `calendar.events` scope to
> automatically write their scheduled jobs and appointments onto their own
> Google Calendar as events, and to keep those events up to date. Specifically,
> we create an event when a job is scheduled, update the event when the job's
> time, location, or details change, and delete the event when the job is
> cancelled. This lets contractors see their Task Iguana work alongside the
> rest of their calendar. We only create and manage events that Task Iguana
> itself generates; we do not read, display, or process the user's pre-existing
> calendar events. We request `calendar.events` rather than the broader
> `calendar` scope because we never need to manage calendar settings, sharing,
> or other calendars — only the job events we create.

## "How is the requested scope used?" (one-line summary)

> Create, update, and delete the user's own job/appointment events on their
> Google Calendar so their Task Iguana schedule stays in sync. No other
> calendar data is accessed.

---

## Demo video checklist
The reviewer needs a screen recording (unlisted YouTube link is fine) showing:

1. The app's OAuth consent screen, including the **client ID in the URL** so
   they can confirm it matches your project.
2. The user clicking **Connect Google Calendar** and granting the
   `calendar.events` scope on Google's consent screen.
3. The app **using** the granted access — i.e. a Task Iguana job being synced
   and the resulting event appearing on the Google Calendar.
4. (Nice to have) the **Disconnect** flow that revokes access.

Keep it short (60–120s) and narrate what's happening.

---

## Privacy policy — what reviewers verify
Live at: **https://www.taskiguana.com/privacy** (Section 5, "Google Calendar
Integration"). It already states:

- The exact scope used (`calendar.events`) and what it allows.
- How the data is used (create/update/delete job events only).
- That we do **not** read or store pre-existing calendar events.
- Token storage & encryption at rest; no third-party sharing.
- **Limited Use** disclosure citing the Google API Services User Data Policy.
- How to revoke access (in-app Disconnect + Google account permissions page).

No further privacy-policy edits should be needed for submission.

---

## Limited Use statement (in case the form asks for it inline)

> Task Iguana's use and transfer of information received from Google APIs to
> any other app will adhere to the Google API Services User Data Policy,
> including the Limited Use requirements.

---

## Quick facts the form may ask for
| Field | Answer |
| --- | --- |
| App name | Task Iguana |
| App home page | https://www.taskiguana.com |
| Privacy policy | https://www.taskiguana.com/privacy |
| Authorized domain | taskiguana.com |
| Redirect URI | https://www.taskiguana.com/api/google-calendar/callback |
| Scopes | https://www.googleapis.com/auth/calendar.events |
| Restricted scopes? | No (sensitive only — no CASA audit) |
| Data accessed | Only events Task Iguana creates on the user's calendar |
| Data shared with third parties? | No |
| Support email | support@taskiguana.com |
