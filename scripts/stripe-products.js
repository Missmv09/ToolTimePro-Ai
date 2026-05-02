/**
 * ToolTime Pro — canonical Stripe product & price catalog.
 *
 * Single source of truth for setup, audit, and sync scripts.
 * When pricing changes, edit this file and re-run sync-stripe-prices.js.
 */

const PRODUCTS = [
  // === Core Plans ===
  {
    id: 'starter',
    name: 'ToolTime Pro — Starter',
    description: 'Owner + 2 workers. Website, booking, quoting, invoicing, GPS clock-in, ToolTime Shield, Jenny Lite included.',
    prices: [
      { key: 'monthly', amount: 4900, interval: 'month' },
      { key: 'annual', amount: 49000, interval: 'year' },
    ],
  },
  {
    id: 'pro',
    name: 'ToolTime Pro — Pro',
    description: 'Up to 15 workers. Everything in Starter + Review Machine, Jenny Lite, dispatch, QuickBooks sync, break tracking.',
    prices: [
      { key: 'monthly', amount: 7900, interval: 'month' },
      { key: 'annual', amount: 79000, interval: 'year' },
    ],
  },
  {
    id: 'elite',
    name: 'ToolTime Pro — Elite',
    description: 'Unlimited workers. Everything in Pro + Jenny Pro, Dispatch, Route Optimization, Customer Portal Pro, QuickBooks included.',
    prices: [
      { key: 'monthly', amount: 12900, interval: 'month' },
      { key: 'annual', amount: 129000, interval: 'year' },
    ],
  },

  // === Standalone Plans ===
  {
    id: 'booking_only',
    name: 'ToolTime Pro — Booking Only',
    description: 'Online booking page only. For businesses that just need scheduling.',
    prices: [
      { key: 'monthly', amount: 1500, interval: 'month' },
      { key: 'annual', amount: 15000, interval: 'year' },
    ],
  },
  {
    id: 'invoicing_only',
    name: 'ToolTime Pro — Invoicing Only',
    description: 'Invoicing and card payments only. For businesses that just need to get paid.',
    prices: [
      { key: 'monthly', amount: 1500, interval: 'month' },
      { key: 'annual', amount: 15000, interval: 'year' },
    ],
  },

  // === Jenny AI Tiers ===
  {
    id: 'jenny_lite',
    name: 'Jenny Lite — ToolTime Assistant',
    description: '24/7 website chatbot. Lead capture, FAQ answering, appointment booking. Bilingual English/Spanish. Included free with all plans.',
    prices: [
      { key: 'monthly', amount: 1900, interval: 'month' },
      { key: 'annual', amount: 19000, interval: 'year' },
    ],
  },
  {
    id: 'jenny_pro',
    name: 'Jenny Pro — AI Phone Receptionist',
    description: 'AI phone answering 24/7 with bilingual voice. SMS messaging, direct booking, emergency escalation. Included with Elite.',
    prices: [
      { key: 'monthly', amount: 4900, interval: 'month' },
      { key: 'annual', amount: 49000, interval: 'year' },
    ],
  },
  {
    id: 'jenny_exec_admin',
    name: 'Jenny Exec Admin — Business Intelligence',
    description: 'Compliance advisor, HR law monitoring, workforce analytics, proactive business insights.',
    prices: [
      { key: 'monthly', amount: 7900, interval: 'month' },
      { key: 'annual', amount: 79000, interval: 'year' },
    ],
  },

  // === Add-ons ===
  {
    id: 'website_builder',
    name: 'Website Builder Add-on',
    description: 'Custom landing page built for your business.',
    prices: [
      { key: 'monthly', amount: 2500, interval: 'month' },
      { key: 'annual', amount: 25000, interval: 'year' },
    ],
  },
  {
    id: 'keep_me_legal',
    name: 'Compliance Autopilot Add-on',
    description: 'Automated compliance monitoring, law-change alerts, and cert renewal reminders.',
    prices: [
      { key: 'monthly', amount: 2900, interval: 'month' },
      { key: 'annual', amount: 29000, interval: 'year' },
    ],
  },
  {
    id: 'extra_page',
    name: 'Extra Website Page Add-on',
    description: 'Add additional pages to your ToolTime Pro website.',
    prices: [
      { key: 'monthly', amount: 1000, interval: 'month' },
      { key: 'annual', amount: 10000, interval: 'year' },
    ],
  },
  {
    id: 'quickbooks_sync',
    name: 'QuickBooks Sync Add-on',
    description: 'Two-way sync with QuickBooks Online. Invoices, payments, and customers auto-sync.',
    prices: [
      { key: 'monthly', amount: 1200, interval: 'month' },
      { key: 'annual', amount: 12000, interval: 'year' },
    ],
  },
  {
    id: 'customer_portal_pro',
    name: 'Customer Portal Pro Add-on',
    description: 'Branded customer portal: job tracker, photo gallery, messaging, document vault, service history. Included with Elite.',
    prices: [
      { key: 'monthly', amount: 2400, interval: 'month' },
      { key: 'annual', amount: 24000, interval: 'year' },
    ],
  },
  {
    id: 'extra_worker',
    name: 'Extra Worker/Technician',
    description: 'Add additional workers beyond your plan limit. $7/user/month.',
    prices: [
      { key: 'monthly', amount: 700, interval: 'month' },
    ],
  },

  // === One-time Setup Services ===
  {
    id: 'assisted_onboarding',
    name: 'Assisted Onboarding',
    description: 'Guided setup with our team. Account setup, customer import, 30-minute training call.',
    prices: [
      { key: 'one_time', amount: 19900 },
    ],
  },
  {
    id: 'white_glove',
    name: 'White Glove Setup',
    description: 'Full done-for-you setup. Website design, data import, 1-hour training, 30-day priority support.',
    prices: [
      { key: 'one_time', amount: 49900 },
    ],
  },
];

module.exports = { PRODUCTS };
