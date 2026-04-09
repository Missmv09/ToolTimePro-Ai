# Calendly Integration — Onboarding Booking Setup

This guide explains how to set up Calendly for ToolTime Pro's paid onboarding services so customers can self-schedule their setup sessions.

---

## Overview

ToolTime Pro offers two onboarding packages that customers can book via Calendly:

| Package | Price | Duration | Description |
|---------|-------|----------|-------------|
| **Assisted Onboarding** | $199 (one-time) | 60 minutes | Guided setup call — service catalog, team invites, booking page, payment setup |
| **White-Glove Setup** | $499 (one-time) | 90 minutes + async work | Full configuration, data migration, website build, and training |

---

## Step 1: Create Calendly Event Types

### Assisted Onboarding ($199)

1. Log in to [Calendly](https://calendly.com) with your ToolTime Pro team account
2. Click **+ New Event Type** → **One-on-One**
3. Configure:
   - **Event name:** `Assisted Onboarding — ToolTime Pro`
   - **Duration:** 60 minutes
   - **Location:** Zoom (or Google Meet)
   - **Description:**
     ```
     Your Assisted Onboarding session with a ToolTime Pro setup specialist.

     In this 60-minute call, we'll help you:
     • Configure your service catalog and pricing
     • Invite your team and set permissions
     • Set up your online booking page
     • Connect Stripe for payments
     • Configure Jenny AI chatbot
     • Answer any questions about the platform

     Please have the following ready before the call:
     • A list of your services and prices
     • Team member names and email addresses
     • Your business logo (PNG or JPG)
     • Access to your Stripe account (or be ready to create one)
     ```
   - **Availability:** Business hours (e.g., Mon–Fri 9am–5pm your timezone)
   - **Buffer time:** 15 minutes before and after
   - **Minimum notice:** 24 hours
4. Save the event type

### White-Glove Setup ($499)

1. Click **+ New Event Type** → **One-on-One**
2. Configure:
   - **Event name:** `White-Glove Setup — ToolTime Pro`
   - **Duration:** 90 minutes
   - **Location:** Zoom (or Google Meet)
   - **Description:**
     ```
     Your White-Glove Setup session with a ToolTime Pro senior specialist.

     This premium onboarding includes:
     • Everything in Assisted Onboarding, plus:
     • Full account configuration tailored to your business
     • Data migration from your current platform (customers, services, history)
     • Custom professional website build (up to your plan's page limit)
     • Team training session (all workers and admins)
     • 30-day post-setup support via email

     Please have the following ready before the call:
     • All items from Assisted Onboarding checklist
     • Export of customer data from your current platform (CSV preferred)
     • Any branding assets (logo, colors, photos of your work)
     • List of pages/content you want on your website
     ```
   - **Availability:** Business hours
   - **Buffer time:** 30 minutes before and after
   - **Minimum notice:** 48 hours
3. Save the event type

---

## Step 2: Connect Stripe to Calendly for Payments

Calendly supports collecting payment at booking time via Stripe:

1. In Calendly, go to **Integrations** → **Stripe**
2. Click **Connect** and authorize your Stripe account
3. For each event type:
   - Edit the event → **Payment** section
   - Enable **Collect payment**
   - Set the price:
     - Assisted Onboarding: **$199.00**
     - White-Glove Setup: **$499.00**
   - Payment is collected at booking time (no refund headaches for no-shows)

> **Note:** If you prefer to handle payment separately through ToolTime Pro's Stripe checkout, skip this step and use the "free booking" approach. Direct customers to the pricing page to purchase the onboarding package, then share the Calendly link in the confirmation email.

---

## Step 3: Set Up Confirmation Emails

### Calendly Confirmation Email Template

Customize the confirmation email for each event type:

**Subject:** `Your ToolTime Pro [Assisted Onboarding / White-Glove Setup] Is Booked!`

**Body:**
```
Hi {invitee_first_name},

Your {event_name} session is confirmed!

📅 Date: {event_date}
🕐 Time: {event_time}
📍 Location: {location}

Before your session, please:
1. Log in to your ToolTime Pro account at https://www.tooltimepro.com/auth/login
2. Complete the Getting Started checklist on your dashboard
3. Prepare the items listed in the event description

If you need to reschedule, use the link in this email.

Questions? Email support@tooltimepro.com or call 1-888-980-8665.

See you soon!
— The ToolTime Pro Team
```

---

## Step 4: Embed Calendly Links in ToolTime Pro

### Option A: Link from Pricing Page and Dashboard

Add Calendly booking links to these locations:

**Pricing page (`src/app/pricing/page.jsx`):**
The onboarding packages are already listed. Update the CTA buttons to link to Calendly:

```jsx
// Assisted Onboarding
<a
  href="https://calendly.com/tooltimepro/assisted-onboarding"
  target="_blank"
  rel="noopener noreferrer"
  className="btn btn-primary"
>
  Book Assisted Onboarding — $199
</a>

// White-Glove Setup
<a
  href="https://calendly.com/tooltimepro/white-glove-setup"
  target="_blank"
  rel="noopener noreferrer"
  className="btn btn-primary"
>
  Book White-Glove Setup — $499
</a>
```

**Dashboard Getting Started checklist:**
Add an optional step linking to onboarding booking for users who want guided setup.

### Option B: Embed Calendly Inline Widget

For a more integrated experience, embed Calendly directly in a ToolTime Pro page:

```tsx
// src/app/dashboard/onboarding-booking/page.tsx
'use client';

import { useEffect } from 'react';

export default function OnboardingBookingPage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-500 mb-2">
        Book Your Onboarding Session
      </h1>
      <p className="text-gray-600 mb-6">
        Get up and running faster with a guided setup from our team.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Assisted Onboarding */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-navy-500">
            Assisted Onboarding
          </h2>
          <p className="text-3xl font-bold text-gold-500 mt-2">$199</p>
          <p className="text-sm text-gray-500 mt-1">One-time • 60 minutes</p>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>✓ Guided setup call with specialist</li>
            <li>✓ Service catalog configuration</li>
            <li>✓ Team invites and permissions</li>
            <li>✓ Booking page setup</li>
            <li>✓ Payment integration</li>
            <li>✓ Jenny AI configuration</li>
          </ul>
          <div
            className="calendly-inline-widget mt-4"
            data-url="https://calendly.com/tooltimepro/assisted-onboarding"
            style={{ minWidth: '280px', height: '400px' }}
          />
        </div>

        {/* White-Glove Setup */}
        <div className="card p-6 border-2 border-gold-500">
          <div className="badge badge-gold mb-2">Most Popular</div>
          <h2 className="text-lg font-semibold text-navy-500">
            White-Glove Setup
          </h2>
          <p className="text-3xl font-bold text-gold-500 mt-2">$499</p>
          <p className="text-sm text-gray-500 mt-1">
            One-time • 90 min call + async work
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>✓ Everything in Assisted Onboarding</li>
            <li>✓ Full account configuration</li>
            <li>✓ Data migration from current platform</li>
            <li>✓ Custom website build</li>
            <li>✓ Team training session</li>
            <li>✓ 30-day post-setup support</li>
          </ul>
          <div
            className="calendly-inline-widget mt-4"
            data-url="https://calendly.com/tooltimepro/white-glove-setup"
            style={{ minWidth: '280px', height: '400px' }}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Step 5: Post-Booking Automation (Optional)

### Calendly Webhook → ToolTime Pro

Set up a Calendly webhook to notify ToolTime Pro when a session is booked:

1. In Calendly, go to **Integrations** → **Webhooks** (requires Calendly Pro plan)
2. Add a webhook URL: `https://www.tooltimepro.com/api/webhooks/calendly`
3. Subscribe to events: `invitee.created`, `invitee.canceled`

### API Route to Handle Webhook

Create an API route to process Calendly events:

```js
// src/app/api/webhooks/calendly/route.js

export async function POST(request) {
  const body = await request.json();
  const event = body.event;

  if (event === 'invitee.created') {
    const { email, name } = body.payload.invitee;
    const eventType = body.payload.event_type.name;

    // Log the booking, send internal notification, update CRM, etc.
    console.log(`Onboarding booked: ${name} (${email}) — ${eventType}`);

    // Optional: Create a notification in ToolTime Pro
    // await createNotification({ type: 'onboarding_booked', ... });
  }

  return new Response('OK', { status: 200 });
}
```

---

## Step 6: Update Calendly URLs

Replace the placeholder Calendly URLs in this guide with your actual event links:

| Event | Placeholder URL | Replace With |
|-------|----------------|-------------|
| Assisted Onboarding | `https://calendly.com/tooltimepro/assisted-onboarding` | Your actual Calendly link |
| White-Glove Setup | `https://calendly.com/tooltimepro/white-glove-setup` | Your actual Calendly link |

---

## Environment Variables

Add to your Netlify environment:

```bash
# Optional: Calendly webhook secret for signature verification
CALENDLY_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create two Calendly event types (Assisted $199, White-Glove $499) |
| 2 | Connect Stripe to Calendly for payment collection |
| 3 | Customize confirmation emails |
| 4 | Add Calendly links/embeds to pricing page and dashboard |
| 5 | (Optional) Set up webhook for booking notifications |
| 6 | Replace placeholder URLs with real Calendly links |

Questions? Contact the ToolTime Pro engineering team or email support@tooltimepro.com.
