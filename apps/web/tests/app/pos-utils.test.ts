import { describe, expect, it } from 'vitest'

import {
  linePreDiscountTotal,
  orderPayableTotal,
  orderPreDiscountSubtotal,
  roundMoney,
} from '@/app/(protected)/analytics/locations/[id]/pos/pos-utils'

describe('pos discount totals', () => {
  it('does not double-count bill discount when lineTotal is post-discount gross', () => {
    // Backend: item 4.50, 10% discount → discountAmount 0.45, line.lineTotal 4.05, gross 4.05
    const lines = [{ unitPrice: 4.5, qty: 1, lineTotal: 4.05 }]
    const order = { lines, discountAmount: 0.45, gross: 4.05 }

    expect(orderPreDiscountSubtotal(lines)).toBe(4.5)
    expect(linePreDiscountTotal(lines[0]!)).toBe(4.5)
    expect(orderPayableTotal(order)).toBe(4.05)
    // Bug pattern: summing lineTotal then subtracting discount again
    expect(roundMoney(4.05 - 0.45)).toBe(3.6)
  })

  it('falls back to subtotal − discount when gross is missing', () => {
    const lines = [{ unitPrice: 10, qty: 2 }]
    expect(orderPayableTotal({ lines, discountAmount: 3 })).toBe(17)
  })
})
