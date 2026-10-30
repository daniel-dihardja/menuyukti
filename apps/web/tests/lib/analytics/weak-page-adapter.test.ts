import { describe, expect, it } from 'vitest'

import { adaptWeakPage } from '@/lib/analytics/weak-page-adapter'

const matrixItems = [
  {
    menu: 'Star Burger',
    quantity: 100,
    totalRevenue: 1000,
    cogs: 2,
    totalCogs: 200,
    contributionMargin: 800,
    contributionMarginPercentage: 0.8,
    marginPerUnit: 8,
    weValue: 0.2,
    category: 'star',
    action: 'keep',
    menuCategory: 'Mains',
    menuCategoryDetail: null,
  },
  {
    menu: 'Weak Salad',
    quantity: 10,
    totalRevenue: 50,
    cogs: 3,
    totalCogs: 30,
    contributionMargin: 20,
    contributionMarginPercentage: 0.02,
    marginPerUnit: 2,
    weValue: 0.6,
    category: 'weak',
    action: 'remove',
    menuCategory: 'Sides',
    menuCategoryDetail: null,
  },
  {
    menu: 'Quiet Soup',
    quantity: 20,
    totalRevenue: 80,
    cogs: 2,
    totalCogs: 40,
    contributionMargin: 40,
    contributionMarginPercentage: 0.04,
    marginPerUnit: 2,
    weValue: 0.5,
    category: 'weak',
    action: 'reprice',
    menuCategory: 'Starters',
    menuCategoryDetail: null,
  },
]

const distribution = [
  { category: 'star', itemCount: 1, itemShare: 1 / 3, marginShare: 0.8 },
  { category: 'weak', itemCount: 2, itemShare: 2 / 3, marginShare: 0.06 },
]

describe('adaptWeakPage', () => {
  it('filters to weak rows and derives avg qty/day from period length', () => {
    const model = adaptWeakPage(matrixItems, distribution, '2024-01-01', '2024-01-10')

    expect(model.rows).toHaveLength(2)
    expect(model.stats.periodDays).toBe(10)
    expect(model.stats.itemCount).toBe(2)
    expect(model.stats.totalMenuItems).toBe(3)
    expect(model.stats.itemShare).toBeCloseTo(2 / 3)
    expect(model.stats.marginShare).toBeCloseTo(0.06)
    expect(model.stats.marginAmount).toBe(60)

    const salad = model.rows.find((r) => r.menuItem === 'Weak Salad')
    expect(salad?.avgQtyPerDay).toBeCloseTo(1)
    expect(salad?.action).toBe('remove')
    expect(salad?.contributionMarginShare).toBeCloseTo(0.02)

    const soup = model.rows.find((r) => r.menuItem === 'Quiet Soup')
    expect(soup?.avgQtyPerDay).toBeCloseTo(2)
  })

  it('omits avg qty/day when period dates are missing', () => {
    const model = adaptWeakPage(matrixItems, distribution, null, null)

    expect(model.stats.periodDays).toBeNull()
    expect(model.rows.every((r) => r.avgQtyPerDay === null)).toBe(true)
    expect(model.rows).toHaveLength(2)
  })

  it('returns empty rows when there are no weak items', () => {
    const model = adaptWeakPage(
      [matrixItems[0]!],
      [{ category: 'star', itemCount: 1, itemShare: 1, marginShare: 1 }],
      '2024-01-01',
      '2024-01-07',
    )

    expect(model.rows).toEqual([])
    expect(model.stats.itemCount).toBe(0)
    expect(model.stats.marginAmount).toBe(0)
  })
})
