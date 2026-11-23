import {
  priceBookItemToLine,
  normalizeUnit,
  STARTER_PRICE_BOOK,
  PRICE_BOOK_UNITS,
} from '@/lib/price-book'

describe('priceBookItemToLine', () => {
  const item = { name: 'Lawn mowing', default_price: 45, unit: 'each' as const }

  it('builds a line with quantity 1 by default', () => {
    expect(priceBookItemToLine(item)).toEqual({
      description: 'Lawn mowing',
      quantity: 1,
      unit: 'each',
      price: 45,
      total: 45,
    })
  })

  it('multiplies price by quantity for the total', () => {
    const line = priceBookItemToLine({ name: 'Painting', default_price: 3, unit: 'sqft' }, 250)
    expect(line.total).toBe(750)
    expect(line.quantity).toBe(250)
  })

  it('rounds the total to cents', () => {
    expect(priceBookItemToLine({ name: 'Wash', default_price: 0.35, unit: 'sqft' }, 3).total).toBe(1.05)
  })

  it('falls back to quantity 1 for a non-positive quantity', () => {
    expect(priceBookItemToLine(item, 0).quantity).toBe(1)
    expect(priceBookItemToLine(item, -5).quantity).toBe(1)
  })

  it('treats a missing/NaN price as 0', () => {
    expect(priceBookItemToLine({ name: 'x', default_price: NaN, unit: 'each' }).price).toBe(0)
  })
})

describe('normalizeUnit', () => {
  it('keeps valid units', () => {
    expect(normalizeUnit('hour')).toBe('hour')
    expect(normalizeUnit('linear_ft')).toBe('linear_ft')
  })

  it('falls back to "each" for unknown or empty units', () => {
    expect(normalizeUnit('widgets')).toBe('each')
    expect(normalizeUnit('')).toBe('each')
    expect(normalizeUnit(null)).toBe('each')
    expect(normalizeUnit(undefined)).toBe('each')
  })
})

describe('STARTER_PRICE_BOOK', () => {
  it('only uses valid units', () => {
    for (const item of STARTER_PRICE_BOOK) {
      expect(PRICE_BOOK_UNITS).toContain(item.unit)
    }
  })

  it('has sequential sort_order starting at 0', () => {
    STARTER_PRICE_BOOK.forEach((item, i) => expect(item.sort_order).toBe(i))
  })

  it('every item has a name and a non-negative price', () => {
    for (const item of STARTER_PRICE_BOOK) {
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.default_price).toBeGreaterThanOrEqual(0)
    }
  })
})
