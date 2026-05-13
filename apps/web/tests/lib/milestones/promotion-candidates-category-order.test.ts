import { describe, expect, it } from 'vitest'

import {
  sortPromotionCandidateCategories,
  sortMenuCategorySummaries,
} from '@/lib/milestones/promotion-candidates-category-order'

describe('sortPromotionCandidateCategories', () => {
  it('places the main POS category first and sorts the rest alphabetically', () => {
    const categories = [
      { category: 'Appetizers', starItems: [], puzzleItems: [] },
      { category: 'Cocktails', starItems: [], puzzleItems: [] },
      { category: 'Mains', starItems: [], puzzleItems: [] },
    ]
    const sorted = sortPromotionCandidateCategories(categories, 'Cocktails')
    expect(sorted.map((row) => row.category)).toEqual(['Cocktails', 'Appetizers', 'Mains'])
  })

  it('matches main category case-insensitively', () => {
    const categories = [
      { category: 'Mains', starItems: [], puzzleItems: [] },
      { category: 'drinks', starItems: [], puzzleItems: [] },
    ]
    const sorted = sortPromotionCandidateCategories(categories, 'Drinks')
    expect(sorted.map((row) => row.category)).toEqual(['drinks', 'Mains'])
  })
})

describe('sortMenuCategorySummaries', () => {
  it('places the main POS category first in the input picker', () => {
    const categories = [
      { name: 'Appetizers', itemCount: 3 },
      { name: 'Cocktails', itemCount: 8 },
      { name: 'Mains', itemCount: 12 },
    ]
    const sorted = sortMenuCategorySummaries(categories, 'Cocktails')
    expect(sorted.map((row) => row.name)).toEqual(['Cocktails', 'Appetizers', 'Mains'])
  })
})
