import { describe, expect, it } from 'vitest'

import {
  buildLiftMatrixRows,
  multiItemOrderShare,
  pairLabel,
  sortPairsByLift,
} from '@/lib/analytics/menu-combos-page-adapter'
import type { MenuComboPair } from '@/lib/graphql/queries/analytics'

const samplePair = (overrides: Partial<MenuComboPair> = {}): MenuComboPair => ({
  menuA: 'Burger',
  menuB: 'Fries',
  coOrderCount: 10,
  support: 0.2,
  confidenceAToB: 0.5,
  confidenceBToA: 0.4,
  lift: 1.8,
  menuACategory: 'Mains',
  menuBCategory: 'Sides',
  matrixCategoryA: 'star',
  matrixCategoryB: 'star',
  ...overrides,
})

describe('menu-combos-page-adapter', () => {
  it('computes multi-item order share', () => {
    expect(
      multiItemOrderShare({
        totalOrders: 100,
        multiItemOrderCount: 40,
        avgDistinctItemsPerOrder: 2.1,
        scope: 'top_by_presence',
        focusMenus: ['A', 'B'],
        pairs: [],
        matrixLift: [],
      }),
    ).toBe(0.4)
  })

  it('builds matrix rows aligned with focus menus', () => {
    const rows = buildLiftMatrixRows(
      ['A', 'B'],
      [
        [null, 1.5],
        [1.5, null],
      ],
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]?.values).toEqual([0, 1.5])
    expect(rows[1]?.values).toEqual([1.5, 0])
  })

  it('sorts pairs by lift descending', () => {
    const pairs = sortPairsByLift([
      samplePair({ menuA: 'A', menuB: 'B', lift: 1.1 }),
      samplePair({ menuA: 'C', menuB: 'D', lift: 2.5 }),
    ])
    expect(pairs[0]?.lift).toBe(2.5)
    expect(pairLabel(pairs[0]!)).toBe('C + D')
  })
})
