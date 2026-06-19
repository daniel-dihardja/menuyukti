import { describe, expect, it } from 'vitest'

import {
  adaptComboDayMealHeatmap,
  adaptComboHourlyHeatmap,
  buildLiftMatrixRows,
  deriveComboPairPeakSummary,
  filterPairs,
  findPairForTiming,
  formatMealPeriodWithHours,
  getMenuCategoryOptions,
  getTopComboPair,
  getTopPairsForTiming,
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
        topPairTiming: [],
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

  it('returns top three pairs for timing', () => {
    const pairs = getTopPairsForTiming([
      samplePair({ menuA: 'A', menuB: 'B', lift: 1.1 }),
      samplePair({ menuA: 'C', menuB: 'D', lift: 2.5 }),
      samplePair({ menuA: 'E', menuB: 'F', lift: 2.0 }),
      samplePair({ menuA: 'G', menuB: 'H', lift: 1.8 }),
    ])
    expect(pairs).toHaveLength(3)
    expect(pairs[0]?.lift).toBe(2.5)
  })

  it('finds pair metadata for timing row', () => {
    const pair = samplePair({ menuA: 'Burger', menuB: 'Fries', lift: 2.1 })
    const timing = {
      menuA: 'Burger',
      menuB: 'Fries',
      recommendedWindow: {
        bestDay: 'fri',
        bestMealPeriod: 'lunch',
        bestMealPeriodLabel: 'Lunch',
        bestMealPeriodHoursLabel: '11:00–14:59',
        peakHour: 12,
        coOrderIndex: 1.6,
        sampleCoOrders: 8,
        confidenceTier: 'medium',
      },
      dayMealCells: [],
      hourlyCoOrders: [],
    }
    expect(findPairForTiming([pair], timing)?.lift).toBe(2.1)
    expect(findPairForTiming([], timing)).toBeNull()
  })

  it('derives peak day-meal slot by co-order index and peak hour by count', () => {
    const summary = deriveComboPairPeakSummary({
      menuA: 'Burger',
      menuB: 'Fries',
      recommendedWindow: {
        bestDay: null,
        bestMealPeriod: null,
        bestMealPeriodLabel: null,
        bestMealPeriodHoursLabel: null,
        peakHour: null,
        coOrderIndex: null,
        sampleCoOrders: 0,
        confidenceTier: 'insufficient',
      },
      dayMealCells: [
        {
          day: 'fri',
          mealPeriod: 'lunch',
          mealPeriodLabel: 'Lunch',
          mealPeriodHoursLabel: '11:00–14:59',
          coOrderCount: 8,
          coOrderIndex: 1.6,
          attachRate: 0.4,
        },
        {
          day: 'sat',
          mealPeriod: 'dinner',
          mealPeriodLabel: 'Dinner',
          mealPeriodHoursLabel: '17:00–21:59',
          coOrderCount: 10,
          coOrderIndex: 1.2,
          attachRate: 0.3,
        },
      ],
      hourlyCoOrders: [
        { hour: 12, coOrderCount: 5 },
        { hour: 19, coOrderCount: 7 },
      ],
    })

    expect(summary.peakDay).toBe('fri')
    expect(summary.peakMealPeriodLabel).toBe('Lunch')
    expect(summary.peakHour).toBe(19)
    expect(summary.peakSlotCoOrders).toBe(8)
    expect(summary.peakHourCoOrders).toBe(7)
  })

  it('breaks day-meal peak ties by co-order count then weekday order', () => {
    const summary = deriveComboPairPeakSummary({
      menuA: 'A',
      menuB: 'B',
      recommendedWindow: {
        bestDay: null,
        bestMealPeriod: null,
        bestMealPeriodLabel: null,
        bestMealPeriodHoursLabel: null,
        peakHour: null,
        coOrderIndex: null,
        sampleCoOrders: 0,
        confidenceTier: 'insufficient',
      },
      dayMealCells: [
        {
          day: 'sat',
          mealPeriod: 'lunch',
          mealPeriodLabel: 'Lunch',
          mealPeriodHoursLabel: '11:00–14:59',
          coOrderCount: 4,
          coOrderIndex: 1.5,
          attachRate: 0.2,
        },
        {
          day: 'fri',
          mealPeriod: 'lunch',
          mealPeriodLabel: 'Lunch',
          mealPeriodHoursLabel: '11:00–14:59',
          coOrderCount: 6,
          coOrderIndex: 1.5,
          attachRate: 0.3,
        },
      ],
      hourlyCoOrders: [],
    })

    expect(summary.peakDay).toBe('fri')
    expect(summary.peakSlotCoOrders).toBe(6)
  })

  it('returns empty peak summary when no co-orders exist', () => {
    const summary = deriveComboPairPeakSummary({
      menuA: 'A',
      menuB: 'B',
      recommendedWindow: {
        bestDay: null,
        bestMealPeriod: null,
        bestMealPeriodLabel: null,
        bestMealPeriodHoursLabel: null,
        peakHour: null,
        coOrderIndex: null,
        sampleCoOrders: 0,
        confidenceTier: 'insufficient',
      },
      dayMealCells: [],
      hourlyCoOrders: [{ hour: 12, coOrderCount: 0 }],
    })

    expect(summary.peakDay).toBeNull()
    expect(summary.peakHour).toBeNull()
  })

  it('formats meal period with hour range', () => {
    expect(formatMealPeriodWithHours('Lunch', '11:00–14:59')).toBe('Lunch (11:00–14:59)')
    expect(formatMealPeriodWithHours('Dinner', null)).toBe('Dinner')
    expect(formatMealPeriodWithHours(null, '17:00–21:59')).toBe('17:00–21:59')
  })

  it('adapts day-meal heatmap with meal periods as rows', () => {
    const { rows, columnLabels } = adaptComboDayMealHeatmap([
      {
        day: 'fri',
        mealPeriod: 'lunch',
        mealPeriodLabel: 'Lunch',
        mealPeriodHoursLabel: '11:00–14:59',
        coOrderCount: 8,
        coOrderIndex: 1.6,
        attachRate: 0.4,
      },
    ])
    expect(columnLabels).toHaveLength(7)
    expect(rows).toHaveLength(5)
    const lunchRow = rows.find((row) => row.key === 'lunch')
    expect(lunchRow?.label).toBe('Lunch (11:00–14:59)')
    expect(lunchRow?.values[4]).toBe(1.6)
  })

  it('adapts hourly co-order heatmap within configured hour range', () => {
    const { rows, columnLabels } = adaptComboHourlyHeatmap(
      [
        { hour: 12, coOrderCount: 5 },
        { hour: 13, coOrderCount: 3 },
      ],
      'Burger + Fries',
    )
    expect(rows).toHaveLength(1)
    expect(columnLabels[2]).toBe('12')
    expect(rows[0]?.values[2]).toBe(5)
  })
})
