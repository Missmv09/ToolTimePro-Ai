import livePrices from './stripe-prices.live.json'
import testPrices from './stripe-prices.test.json'

function getStripePrices() {
  const json = process.env.NEXT_PUBLIC_STRIPE_PRICES
  if (json) {
    try {
      return JSON.parse(json)
    } catch (e) {
      console.error('Failed to parse NEXT_PUBLIC_STRIPE_PRICES, falling back to file:', e)
    }
  }
  const secret = process.env.STRIPE_SECRET_KEY || ''
  return secret.startsWith('sk_test_') ? testPrices : livePrices
}

export const PRICE_IDS = getStripePrices()
