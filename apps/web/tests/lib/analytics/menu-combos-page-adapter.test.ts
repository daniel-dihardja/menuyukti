import { describe, expect, it } from 'vitest'

import {
  buildLiftMatrixRows,
  filterPairs,
  getMenuCategoryOptions,
  getTopComboPair,
  groupBundleIdeas,
  liftStrengthClass,
  multiItemOrderShare,
  pairLabel,
  sortPairs,
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

  it('returns top combo pair', () => {
    const top = getTopComboPair([
      samplePair({ lift: 1.2 }),
      samplePair({ menuA: 'Pasta', menuB: 'Wine', lift: 2.1 }),
    ])
    expect(top?.menuA).toBe('Pasta')
    expect(top?.lift).toBe(2.1)
  })

  it('sorts pairs by column and direction', () => {
    const pairs = sortPairs(
      [samplePair({ coOrderCount: 5, lift: 1.2 }), samplePair({ coOrderCount: 20, lift: 1.5 })],
      'coOrderCount',
      'asc',
    )
    expect(pairs[0]?.coOrderCount).toBe(5)
  })

  it('collects unique menu categories', () => {
    const options = getMenuCategoryOptions(
      [
        samplePair({ menuACategory: 'Mains', menuBCategory: 'Sides' }),
        samplePair({
          menuA: 'Salad',
          menuB: 'Soup',
          menuACategory: 'Starters',
          menuBCategory: 'Starters',
        }),
      ],
      'en',
    )
    expect(options).toEqual(['Mains', 'Sides', 'Starters'])
  })

  it('filters pairs by min lift', () => {
    const pairs = [samplePair({ lift: 0.8 }), samplePair({ menuA: 'A', menuB: 'B', lift: 2.0 })]
    const filtered = filterPairs(pairs, {
      menuCategory: 'all',
      minLift: 'above1',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.menuA).toBe('A')
  })

  it('groups bundle ideas by matrix categories', () => {
    const groups = groupBundleIdeas([
      samplePair({ lift: 2.0, matrixCategoryA: 'star', matrixCategoryB: 'star' }),
      samplePair({
        menuA: 'Burger',
        menuB: 'Salad',
        lift: 1.9,
        matrixCategoryA: 'star',
        matrixCategoryB: 'puzzle',
      }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]?.kind).toBe('premium')
    expect(groups[1]?.kind).toBe('upsell')
  })

  it('classifies lift strength for row styling', () => {
    expect(liftStrengthClass(2.0)).toBe('bg-primary/5')
    expect(liftStrengthClass(0.5)).toBe('bg-muted/30')
    expect(liftStrengthClass(1.2)).toBeNull()
  })
})
