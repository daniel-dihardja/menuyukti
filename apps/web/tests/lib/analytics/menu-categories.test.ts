import { describe, expect, it } from 'vitest'

import {
  aggregateMenuCategoriesFromCatalogItems,
  UNCATEGORIZED_MENU_CATEGORY_KEY,
} from '@/lib/analytics/menu-categories'

describe('aggregateMenuCategoriesFromCatalogItems', () => {
  it('groups items by category with counts and sorts alphabetically', () => {
    const out = aggregateMenuCategoriesFromCatalogItems([
      { category: 'Desserts' },
      { category: 'Mains' },
      { category: 'Mains' },
      { category: '' },
    ])
    expect(out).toEqual([
      { name: 'Desserts', itemCount: 1 },
      { name: 'Mains', itemCount: 2 },
      { name: UNCATEGORIZED_MENU_CATEGORY_KEY, itemCount: 1 },
    ])
  })
})
