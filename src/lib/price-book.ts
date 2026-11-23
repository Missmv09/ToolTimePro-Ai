/**
 * Price book — a company's reusable catalog of services/items with set prices.
 * Surfaced in the quote builders so a business quotes from its own approved
 * pricing instead of re-typing line items. See docs/PRICE_BOOK_SCOPE.md.
 */

/** The units a price book item / quote line can be priced in. Shared with the quote builders. */
export const PRICE_BOOK_UNITS = ['each', 'hour', 'sqft', 'linear_ft', 'cubic_yard'] as const
export type PriceBookUnit = (typeof PRICE_BOOK_UNITS)[number]

/** Human label for a unit, for pickers and summaries. */
export const PRICE_BOOK_UNIT_LABELS: Record<PriceBookUnit, string> = {
  each: 'each',
  hour: 'hour',
  sqft: 'sq ft',
  linear_ft: 'linear ft',
  cubic_yard: 'cubic yard',
}

/** A row in `price_book_items`. */
export interface PriceBookItem {
  id: string
  company_id: string
  name: string
  default_price: number
  unit: PriceBookUnit
  category: string | null
  taxable: boolean
  active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

/** The fields needed to create one. */
export type PriceBookItemInput = {
  name: string
  default_price: number
  unit: PriceBookUnit
  category?: string | null
  taxable?: boolean
  sort_order?: number
}

/**
 * A quote line assembled from a price book item — the neutral shape both quote
 * builders map into their own line-item type (each supplies its own row id).
 */
export interface PriceBookLine {
  description: string
  quantity: number
  unit: PriceBookUnit
  price: number
  total: number
}

/**
 * Turn a price book item into a quote line (quantity defaults to 1). Pure —
 * the caller adds its own row id and merges it into its line-item list.
 */
export function priceBookItemToLine(item: Pick<PriceBookItem, 'name' | 'default_price' | 'unit'>, quantity = 1): PriceBookLine {
  const qty = quantity > 0 ? quantity : 1
  const price = Number(item.default_price) || 0
  return {
    description: item.name,
    quantity: qty,
    unit: item.unit,
    price,
    total: Math.round(price * qty * 100) / 100,
  }
}

/** Normalize an arbitrary unit string to a valid PriceBookUnit (falls back to 'each'). */
export function normalizeUnit(unit: string | null | undefined): PriceBookUnit {
  return (PRICE_BOOK_UNITS as readonly string[]).includes(unit || '') ? (unit as PriceBookUnit) : 'each'
}

/**
 * A small, trade-neutral set a company can one-click load to bootstrap its
 * price book (the "Load starter list" button). Prices are placeholders the
 * owner edits; the point is to avoid an empty screen.
 */
const STARTER_ITEMS: PriceBookItemInput[] = [
  { name: 'Lawn mowing', default_price: 45, unit: 'each', category: 'Lawn & Garden' },
  { name: 'Tree / hedge trimming', default_price: 120, unit: 'each', category: 'Lawn & Garden' },
  { name: 'Yard cleanup', default_price: 65, unit: 'each', category: 'Lawn & Garden' },
  { name: 'General labor', default_price: 85, unit: 'hour', category: 'Labor' },
  { name: 'Service call / diagnostic', default_price: 95, unit: 'each', category: 'Service' },
  { name: 'Window cleaning', default_price: 8, unit: 'each', category: 'Cleaning' },
  { name: 'Painting', default_price: 3, unit: 'sqft', category: 'Painting' },
  { name: 'Pressure washing', default_price: 0.35, unit: 'sqft', category: 'Cleaning' },
]

export const STARTER_PRICE_BOOK: PriceBookItemInput[] = STARTER_ITEMS.map((item, i) => ({ ...item, sort_order: i }))
