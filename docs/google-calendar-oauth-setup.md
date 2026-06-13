# Google Calendar Integration — Google Cloud Setup Guide

This is the click-by-click guide for getting ToolTime Pro's Google Calendar
integration approved and live. The **application code is already complete**
(connect → callback → sync, with token refresh). Everything below is the
**Google Cloud Console + Netlify** configuration that the code depends on.

The connect route returns `"Google Calendar is not configured"` until
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Netlify — completing
this guide is what turns the feature on.

---

## At a glance

| Item | Value |
| --- | --- |
| Google API to enable | **Google Calendar API** |
| OAuth client type | **Web application** |
| Scope requested | `https://www.googleapis.com/auth/calendar.events` (sensitive, **not** restricted) |
| Authorized redirect URI | `https://app.tooltimepro.com/api/google-calendar/callback` |
| Netlify env vars | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Verification needed? | **Yes** for production (the scope is sensitive) |
| Security audit (CASA) needed? | **No** — `calendar.events` is sensitive but not restricted |
| Typical review time | A few days to a few weeks |

> **Why verification is not optional:** In unverified "Testing" mode you are
> capped at 100 test users **and refresh tokens expire after 7 days**. Our sync
> relies on a stored refresh token to keep calendars in sync in the background,
> so an expired refresh token would silently break the feature. Publishing +
> verifying removes both limits.

---

## Part 1 — Cloud Console setup (do this first)

### 1. Create / select a project
1. Go to <https://console.cloud.google.com/>.
2. Top bar → project dropdown → **New Project**.
3. Name it `ToolTime Pro` → **Create** → make sure it's selected.

### 2. Enable the Google Calendar API
1. Left menu → **APIs & Services → Library**.
2. Search **Google Calendar API** → open it → **Enable**.

### 3. Configure the OAuth consent screen
1. **APIs & Services → OAuth consent screen**.
2. User type: **External** → **Create**.
3. Fill in **App information**:
   - App name: `ToolTime Pro`
   - User support email: `support@tooltimepro.com`
   - App logo: upload the ToolTime Pro logo (required for verification).
4. **App domain**:
   - Application home page: `https://tooltimepro.com`
   - Privacy policy: `https://tooltimepro.com/privacy`
   - Terms of service: `https://tooltimepro.com/terms` (if available)
5. **Authorized domains**: add `tooltimepro.com`.
   *(This single domain covers `tooltimepro.com` and `app.tooltimepro.com`.)*
6. Developer contact email: `support@tooltimepro.com`.
7. **Save and Continue**.

> ⚠️ The homepage, privacy policy, and redirect URI must all live under an
> authorized domain you own and have verified in Google Search Console.
> Verify `tooltimepro.com` in Search Console before submitting if you haven't.

### 4. Add the scope
1. On the **Scopes** step → **Add or Remove Scopes**.
2. Filter for `calendar.events` and select
   `https://www.googleapis.com/auth/calendar.events`.
3. **Update → Save and Continue**.

### 5. Add test users (for now)
1. On the **Test users** step, add your own Google account(s) so you can test
   end-to-end before verification completes.
2. **Save and Continue**.

### 6. Create the OAuth client credentials
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name: `ToolTime Pro Web`.
4. **Authorized redirect URIs → Add URI** — paste **exactly**:
   ```
   https://app.tooltimepro.com/api/google-calendar/callback
   ```
   *(The code builds this from `NEXT_PUBLIC_APP_URL` + `/api/google-calendar/callback`.
   If you ever change `NEXT_PUBLIC_APP_URL`, update this URI to match.)*
5. *(Optional, for local testing)* also add
   `http://localhost:3000/api/google-calendar/callback`.
6. **Create**. Copy the **Client ID** and **Client secret** — you'll need them
   in Part 2.

---

## Part 2 — Wire it into Netlify
1. Netlify → ToolTime Pro site → **Site configuration → Environment variables**.
2. Add:
   - `GOOGLE_CLIENT_ID` = *(the Client ID from step 6)*
   - `GOOGLE_CLIENT_SECRET` = *(the Client secret from step 6)*
3. Confirm `NEXT_PUBLIC_APP_URL` = `https://app.tooltimepro.com` (the redirect
   URI is derived from it).
4. **Redeploy** the site so the new env vars take effect.
5. Smoke test: log in → Settings → **Connect Google Calendar**. You should get
   the Google consent screen (with an "unverified app" warning that's expected
   pre-verification — click *Advanced → Go to ToolTime Pro* to proceed as a
   test user). Approve, then run a sync and confirm a job appears on the calendar.

---

## Part 3 — Submit for verification
1. Back on the **OAuth consent screen**, click **Publish App** → confirm
   (moves from "Testing" to "In production").
2. Click **Prepare for verification** and complete the form. Google will ask
   for:
   - A justification for the `calendar.events` scope.
   - A short video (screen recording) showing the OAuth grant flow and how the
     data is used in the app.
   - Confirmation your privacy policy discloses Google data use + Limited Use.
3. Use the ready-made answers in
   [`google-calendar-verification-answers.md`](./google-calendar-verification-answers.md).
4. Submit and watch `support@tooltimepro.com` for follow-ups from the Trust &
   Safety team — replying promptly is the biggest factor in turnaround time.

---

## Troubleshooting
- **"Google Calendar is not configured"** → env vars missing or site not
  redeployed after adding them.
- **`redirect_uri_mismatch`** → the URI in the Console doesn't byte-for-byte
  match `${NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`. Watch for a
  trailing slash or `http` vs `https`.
- **Refresh token stops working after ~7 days** → app is still in "Testing"
  mode. Publish + verify (Part 3).
- **`access_denied` on consent** → the test account isn't in the Test users
  list (pre-verification only).
