import { describe, expect, it } from 'vitest'

import {
  sortPromotionCandidateCategories,
  sortMenuCategorySummaries,
  sortPromotionCandidateItemsByPopularity,
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

describe('sortPromotionCandidateItemsByPopularity', () => {
  it('sorts by popularity descending with name tie-break', () => {
    const items = [
      {
        name: 'Soup',
        popularity: 0.1,
        storytellingFit: 'weak' as const,
        storytellingRationale: '',
      },
      {
        name: 'Steak',
        popularity: 0.4,
        storytellingFit: 'weak' as const,
        storytellingRationale: '',
      },
      {
        name: 'Pasta',
        popularity: 0.4,
        storytellingFit: 'weak' as const,
        storytellingRationale: '',
      },
    ]
    const sorted = sortPromotionCandidateItemsByPopularity(items)
    expect(sorted.map((row) => row.name)).toEqual(['Pasta', 'Steak', 'Soup'])
  })

  it('places items without popularity after scored items', () => {
    const items = [
      { name: 'Legacy', storytellingFit: 'weak' as const, storytellingRationale: '' },
      {
        name: 'Star',
        popularity: 0.2,
        storytellingFit: 'weak' as const,
        storytellingRationale: '',
      },
    ]
    const sorted = sortPromotionCandidateItemsByPopularity(items)
    expect(sorted.map((row) => row.name)).toEqual(['Star', 'Legacy'])
  })
})
