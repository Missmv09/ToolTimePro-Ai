/**
 * Parses Stripe price IDs from a single NEXT_PUBLIC_STRIPE_PRICES JSON env var.
 *
 * Expected JSON structure matches the PRICE_IDS shape:
 * {
 *   "starter": { "monthly": "price_...", "annual": "price_..." },
 *   "pro": { "monthly": "price_...", "annual": "price_..." },
 *   "elite": { "monthly": "price_...", "annual": "price_..." },
 *   "booking_only": { "monthly": "price_...", "annual": "price_..." },
 *   "invoicing_only": { "monthly": "price_...", "annual": "price_..." },
 *   "jenny_lite": { "monthly": "price_...", "annual": "price_..." },
 *   "jenny_pro": { "monthly": "price_...", "annual": "price_..." },
 *   "jenny_exec_admin": { "monthly": "price_...", "annual": "price_..." },
 *   "website_builder": { "monthly": "price_...", "annual": "price_..." },
 *   "keep_me_legal": { "monthly": "price_...", "annual": "price_..." },
 *   "extra_page": { "monthly": "price_...", "annual": "price_..." },
 *   "extra_worker": { "monthly": "price_..." },
 *   "quickbooks_sync": { "monthly": "price_...", "annual": "price_..." },
 *   "assisted_onboarding": "price_...",
 *   "white_glove": "price_..."
 * }
 */

function getStripePrices() {
  const json = process.env.NEXT_PUBLIC_STRIPE_PRICES
  if (!json) {
    console.warn('NEXT_PUBLIC_STRIPE_PRICES is not set')
    return {}
  }
  try {
    return JSON.parse(json)
  } catch (e) {
    console.error('Failed to parse NEXT_PUBLIC_STRIPE_PRICES:', e)
    return {}
  }
}

export const PRICE_IDS = getStripePrices()
