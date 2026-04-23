import livePrices from './stripe-prices.live.json'
import testPrices from './stripe-prices.test.json'

function getStripePrices() {
  const secret = process.env.STRIPE_SECRET_KEY || ''
  if (secret.startsWith('sk_test_')) return testPrices
  return livePrices
}

export const PRICE_IDS = getStripePrices()
