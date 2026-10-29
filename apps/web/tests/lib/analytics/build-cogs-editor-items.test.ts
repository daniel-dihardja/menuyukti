import { describe, expect, it } from 'vitest'

import { mergeCogsEditorItems } from '@/lib/analytics/build-cogs-editor-items'

describe('mergeCogsEditorItems', () => {
  it('merges matrix rows with existing COGS and sorts by name', () => {
    const items = mergeCogsEditorItems({
      analyticsRunId: '1',
      matrixItems: [
        {
          menu: 'Burger',
          quantity: 10,
          totalRevenue: 100,
          menuCategory: 'Mains',
        },
        {
          menu: 'Apple Pie',
          quantity: 5,
          totalRevenue: 50,
          menuCategory: 'Dessert',
        },
      ],
      menuItemCogs: [{ id: 42, menu: 'Burger', cogs: 3.5, menuCategory: 'Mains' }],
      catalog: null,
    })

    expect(items.map((i) => i.menuName)).toEqual(['Apple Pie', 'Burger'])
    expect(items[0]).toMatchObject({
      menuName: 'Apple Pie',
      cogs: null,
      price: 10,
      quantity: 5,
    })
    expect(items[1]).toMatchObject({
      id: 42,
      menuName: 'Burger',
      cogs: 3.5,
      price: 10,
      quantity: 10,
    })
  })

  it('includes COGS rows missing from the matrix', () => {
    const items = mergeCogsEditorItems({
      analyticsRunId: '1',
      matrixItems: [
        {
          menu: 'Burger',
          quantity: 10,
          totalRevenue: 100,
          menuCategory: 'Mains',
        },
      ],
      menuItemCogs: [
        { id: 1, menu: 'Burger', cogs: 2, menuCategory: 'Mains' },
        { id: 2, menu: 'Legacy Side', cogs: 1, menuCategory: 'Sides' },
      ],
      catalog: null,
    })

    expect(items).toHaveLength(2)
    expect(items.find((i) => i.menuName === 'Legacy Side')).toMatchObject({
      id: 2,
      cogs: 1,
      quantity: 0,
      price: 0,
    })
  })

  it('falls back to catalog when matrix and COGS yield no rows', () => {
    const items = mergeCogsEditorItems({
      analyticsRunId: '99',
      matrixItems: [],
      menuItemCogs: [],
      catalog: {
        analyticsRunId: '99',
        items: [
          {
            id: '7',
            name: 'Soup',
            category: 'Starters',
            price: 8,
            quantity: 4,
          },
        ],
      },
    })

    expect(items).toEqual([
      {
        id: 7,
        menuName: 'Soup',
        cogs: null,
        quantity: 4,
        totalRevenue: 32,
        price: 8,
        menuCategory: 'Starters',
      },
    ])
  })

  it('ignores catalog when analyticsRunId does not match', () => {
    const items = mergeCogsEditorItems({
      analyticsRunId: '1',
      matrixItems: [],
      menuItemCogs: [],
      catalog: {
        analyticsRunId: '2',
        items: [
          {
            id: '1',
            name: 'Soup',
            category: 'Starters',
            price: 8,
            quantity: 1,
          },
        ],
      },
    })

    expect(items).toEqual([])
  })
})
