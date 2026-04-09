# Settings & Integrations

Configure your company profile, connect third-party tools, manage your subscription, and set up webhooks for custom integrations.

---

## Settings

Go to **Settings** in the sidebar to access your account configuration.

### Account Tab

Update your company information:

| Field | Description |
|-------|-------------|
| **Company Name** | Your business name |
| **Email** | Main contact email |
| **Phone** | Business phone number |
| **Address** | Office or business address |
| **Website** | Your company website URL |
| **Quote Terms** | Default terms and conditions for quotes |

Click **Save** to update your changes.

### Integrations Tab

Connect third-party tools to ToolTime Pro:

#### QuickBooks Online

Sync your financial data between ToolTime Pro and QuickBooks:

- **Two-way sync** — Invoices, payments, and customers sync automatically
- **Setup:**
  1. Go to Settings → Integrations
  2. Click **Connect QuickBooks**
  3. Sign in to your QuickBooks account
  4. Authorize the connection
- **What syncs:**
  - Invoices created in ToolTime Pro appear in QuickBooks
  - Payments recorded in either system sync across
  - Customer records stay in sync
- **Monitoring:** View last sync time and sync status
- **Disconnect:** Click **Disconnect QuickBooks** if you need to unlink

> **Pricing:** QuickBooks Sync is included with Elite plans, or available as an add-on for $12/mo.

#### Google Calendar

Sync your job schedule with Google Calendar:

- Jobs appear as events on your Google Calendar
- Changes sync both ways
- Great for managing your schedule alongside personal events

### Subscription Tab

View and manage your plan:
- Current plan name and tier
- Monthly or annual pricing
- Billing period
- Upgrade or downgrade options

---

## Webhooks

Webhooks let you send real-time notifications to external systems when events happen in ToolTime Pro. Perfect for custom integrations, Zapier connections, or internal tools.

### Setting Up a Webhook

1. Go to **Webhooks** in the sidebar
2. Click **+ New Webhook**
3. Configure:
   - **URL** — The endpoint to receive webhook events
   - **Events** — Select which events trigger the webhook:

| Category | Available Events |
|----------|-----------------|
| **Jobs** | Job created, updated, completed, cancelled |
| **Invoicing** | Invoice created, sent, paid, overdue |
| **Quotes** | Quote created, sent, accepted, rejected |
| **Customers** | Customer created, updated |
| **Leads** | Lead created, status changed |
| **Bookings** | Booking created, cancelled |
| **Reviews** | Review received |
| **Worker Actions** | Clock-in, clock-out, break start/end |

4. Save — a **webhook secret** is auto-generated for security

### Managing Webhooks

- **Enable/Disable** — Toggle webhooks on or off without deleting
- **View Logs** — See the last 20 events with:
  - Timestamp
  - Event type
  - Success/failure status
  - Response time
- **Failure Count** — Track how many deliveries have failed
- **Last Triggered** — See when the webhook last fired

### Webhook Security

Each webhook gets a unique secret key. Use it to verify that incoming requests are genuinely from ToolTime Pro:

1. ToolTime Pro signs each webhook payload with your secret
2. Your server verifies the signature before processing
3. Reject any requests with invalid signatures

### Common Webhook Use Cases

- **Slack notifications** — Post to a channel when a new booking comes in
- **Zapier automation** — Trigger workflows when invoices are paid
- **Custom CRM** — Sync customer data to your own system
- **SMS alerts** — Send a text when a worker clocks in late
- **Accounting sync** — Push invoice data to custom accounting tools

---

## Stripe Payments

ToolTime Pro uses Stripe for payment processing. Your customers can pay invoices by credit card.

### How It Works

- When you send an invoice, customers receive a payment link
- They enter their card details on a secure Stripe-hosted page
- Payment is deposited to your connected Stripe account
- ToolTime Pro automatically marks the invoice as paid

### Connecting Stripe

Stripe is set up during your initial account configuration. If you need to reconnect:
1. Go to **Settings** → **Integrations**
2. Follow the Stripe connection prompts
3. Verify your bank account for payouts

---

## Plan Availability

| Feature | Starter | Pro | Elite |
|---------|:-------:|:---:|:-----:|
| Company settings | Yes | Yes | Yes |
| Stripe payments | Yes | Yes | Yes |
| Google Calendar | Yes | Yes | Yes |
| Webhooks | Yes | Yes | Yes |
| QuickBooks Sync | Add-on $12 | Add-on $12 | Included |

---

## Need Help?

- **Email:** support@tooltimepro.com
- **Phone:** 1-888-980-8665
- **Live Chat:** Click the chat icon in your dashboard
