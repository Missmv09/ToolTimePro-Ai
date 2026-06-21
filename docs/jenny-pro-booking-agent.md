# Jenny Pro — Booking Agent (Missed Call / Text → Booked Job)

Jenny Pro turns an inbound **text or missed call** into a **booked job on the
calendar**, bilingual (English + Spanish, auto-detected per customer), and
notifies the operator. This doc maps the full flow and how to wire it up.

## The flow at a glance

```
                 ┌──────────────────────────── TEXT PATH ───────────────────────────┐
 Customer texts ─┤ Twilio → POST /api/jenny-pro/sms-webhook                          │
                 │   1. log message + thread (jenny_sms_conversations / _messages)   │
                 │   2. STOP / START / HELP compliance                               │
                 │   3. emergency keywords → escalate to operator (no booking)       │
                 │   4. runJennyAgent() → bilingual reply (Claude, OpenAI fallback)  │
                 │   5. when name+service+date+time known & auto_booking on:          │
                 │        createBooking() → job + customer + lead                     │
                 │        notify operator (in-app + SMS)                              │
                 │   6. reply via TwiML <Message>                                     │
                 └───────────────────────────────────────────────────────────────────┘

                 ┌──────────────────────────── CALL PATH ───────────────────────────┐
 Customer calls ─┤ Twilio → POST /api/jenny-pro/voice                                │
                 │   • has owner #? <Dial> owner, timeout 18s → /voice/after-dial    │
                 │       └ missed → text the caller (seeds the TEXT PATH) + log +    │
                 │         notify operator                                           │
                 │   • no owner #? → /voice/gather  (AI speech receptionist)         │
                 │       └ speech → runJennyAgent(channel:'voice') → <Say> + <Gather> │
                 │         loop → createBooking() when ready → confirm by voice       │
                 └───────────────────────────────────────────────────────────────────┘
```

## Key modules

| File | Responsibility |
| --- | --- |
| `src/lib/booking-core.js` | `createBooking()` — shared job/customer/lead creation. Used by web bookings, SMS, and voice. |
| `src/lib/jenny-sms-agent.js` | `runJennyAgent()` — the bilingual conversational brain (Claude primary). Returns `{ reply, language, intent, readyToBook, booking, emergency }`. Channel-agnostic. |
| `src/lib/jenny-language.js` | Language auto-detection, EN/ES string bundles, STOP/START/HELP classification. |
| `src/lib/jenny-voice.js` | TwiML builders + voice conversation threading. |
| `src/lib/jenny-notify.js` | Operator notifications (in-app + SMS). |
| `src/app/api/jenny-pro/sms-webhook/route.js` | Inbound SMS handler. |
| `src/app/api/jenny-pro/voice/route.js` | Inbound call handler (ring owner, else AI). |
| `src/app/api/jenny-pro/voice/after-dial/route.js` | Missed-call → text-back. |
| `src/app/api/jenny-pro/voice/gather/route.js` | Conversational speech receptionist. |

## Spanish-first behavior

- **Customer language** (`jenny_pro_settings.language`): `both` (default,
  auto-detects EN/ES and mirrors the customer), `es` (always Spanish), or `en`.
- **Operator language** (`jenny_pro_settings.operator_language`): the language
  of the contractor's own booking / missed-call alerts — independent of the
  customer's language.
- Emergency keywords are matched in **both** English and Spanish.

## Auto-booking

Controlled by `jenny_pro_settings.auto_booking` (default `true`). When on, Jenny
books as soon as she has name + service + date + time, then notifies the
operator. When off, she still collects everything and replies, but does not
create the job (operator confirms manually).

## Operator setup (Twilio)

Set these env vars (already documented in `.env.example`):

```
ANTHROPIC_API_KEY=...          # Jenny's brain (OpenAI fallback: OPENAI_API_KEY)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...         # the business number
TWILIO_MESSAGING_SERVICE_SID=... # A2P 10DLC campaign (preferred for sends)
JENNY_COMPANY_ID=...           # OPTIONAL: pin Jenny to one company. Set this if
                               # the DB has more than one company (e.g. test/demo
                               # records) so Jenny always serves the right business.
                               # Without it, the webhook uses the first company found.
```

On the Twilio phone number, set the webhooks:

| Trigger | Webhook (POST) |
| --- | --- |
| **A Message Comes In** | `https://<domain>/api/jenny-pro/sms-webhook` |
| **A Call Comes In** | `https://<domain>/api/jenny-pro/voice` |

The voice sub-routes (`/voice/after-dial`, `/voice/gather`) are invoked by
Twilio automatically via the TwiML returned by `/voice`.

Then in **Dashboard → Jenny Pro → Settings**, set the on-call/escalation number,
customer language, your notification language, emergency keywords, and the
auto-book toggle.

## Database

Migration `038_jenny_sms_booking_agent.sql` adds:
- `jenny_sms_conversations.language`, `.booking_id`, `.last_intent`
- `jenny_pro_settings.operator_language`

(The `jenny_sms_conversations`, `jenny_sms_messages`, `jenny_voice_calls`, and
`jenny_pro_settings` tables come from `021_jenny_pro_sms_conversations.sql`.)

## Multi-tenant routing (number → company)

Each contractor's Twilio number maps to their company, so Jenny answers as the
right business. Resolution order (`src/lib/jenny-company.js`):

1. **`company_phone_numbers` table** — the real path. An inbound text/call to a
   number is matched (by last 10 digits) to the owning company. A contractor
   registers their number in **Dashboard → Jenny Pro → Settings → Your Jenny
   Phone Number** (migration `039_company_phone_numbers.sql`). One number → one
   company (unique); a company may have several numbers.
2. **`JENNY_COMPANY_ID` env var** — explicit pin for a single live/test business.
3. **First company** — legacy single-tenant fallback.

To onboard a contractor: provision a Twilio number, point its SMS + voice
webhooks at `/api/jenny-pro/sms-webhook` and `/api/jenny-pro/voice`, and register
the number on their company (dashboard, or insert into `company_phone_numbers`).

## Notes / limitations
- The voice receptionist uses Twilio `<Gather input="speech">` + Amazon Polly
  voices (`Polly.Joanna` EN, `Polly.Lupe` ES). It needs a provisioned Twilio
  **Voice** number and live phone testing to validate end-to-end.
- Customers who text first are treated as having initiated contact (TwiML reply
  is a direct response). Outbound marketing still respects `sms_consent` + STOP.
```
