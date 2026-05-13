import { describe, expect, it } from 'vitest'

import type { PromotionCandidateMenuItem } from '@/lib/graphql/node-schemas'
import {
  DEFAULT_PROMOTION_CANDIDATES_PREVIEW_FILTERS,
  countFilteredPromotionCandidateItemsInCategories,
  countPromotionCandidateItemsInCategories,
  filterPromotionCandidateItems,
  hasActivePromotionCandidatesPreviewFilters,
  itemMatchesPromotionCandidatesPreviewFilters,
  type PromotionCandidatesPreviewFilters,
} from '@/lib/milestones/promotion-candidates-filters'

const strongMid: PromotionCandidateMenuItem = {
  name: 'Steak',
  storytellingFit: 'strong',
  storytellingRationale: '',
  priceLevel: 2,
}

const weakHigh: PromotionCandidateMenuItem = {
  name: 'Soup',
  storytellingFit: 'weak',
  storytellingRationale: '',
  priceLevel: 3,
}

const strongNoPrice: PromotionCandidateMenuItem = {
  name: 'Salad',
  storytellingFit: 'strong',
  storytellingRationale: '',
}

const items = [strongMid, weakHigh, strongNoPrice]

describe('promotion candidates preview filters', () => {
  it('passes all items with default filters', () => {
    expect(
      filterPromotionCandidateItems(items, DEFAULT_PROMOTION_CANDIDATES_PREVIEW_FILTERS),
    ).toEqual(items)
    expect(
      hasActivePromotionCandidatesPreviewFilters(DEFAULT_PROMOTION_CANDIDATES_PREVIEW_FILTERS),
    ).toBe(false)
  })

  it('filters storytelling fit to strong only', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: ['strong'],
      priceLevel: [1, 2, 3],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([strongMid, strongNoPrice])
    expect(hasActivePromotionCandidatesPreviewFilters(filters)).toBe(true)
  })

  it('filters storytelling fit to weak only', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: ['weak'],
      priceLevel: [1, 2, 3],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([weakHigh])
  })

  it('filters by a single price level', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: ['strong', 'weak'],
      priceLevel: [3],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([weakHigh])
  })

  it('filters by combined price levels', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: ['strong', 'weak'],
      priceLevel: [2, 3],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([strongMid, weakHigh])
  })

  it('applies AND across storytelling and price filters', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: ['strong'],
      priceLevel: [2],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([strongMid])
    expect(itemMatchesPromotionCandidatesPreviewFilters(weakHigh, filters)).toBe(false)
  })

  it('hides items without priceLevel when price filter is narrowed', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: ['strong', 'weak'],
      priceLevel: [2],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([strongMid])
  })

  it('shows items without priceLevel when all price levels are selected', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: ['strong'],
      priceLevel: [1, 2, 3],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([strongMid, strongNoPrice])
  })

  it('treats empty storytelling selection as no filter on that dimension', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: [],
      priceLevel: [3],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([weakHigh])
    expect(hasActivePromotionCandidatesPreviewFilters(filters)).toBe(true)
  })

  it('treats empty price level selection as no filter on that dimension', () => {
    const filters: PromotionCandidatesPreviewFilters = {
      storytellingFit: ['weak'],
      priceLevel: [],
    }
    expect(filterPromotionCandidateItems(items, filters)).toEqual([weakHigh])
    expect(hasActivePromotionCandidatesPreviewFilters(filters)).toBe(true)
  })

  it('counts total and filtered items across categories', () => {
    const categories = [
      { starItems: [strongMid, strongNoPrice], puzzleItems: [weakHigh] },
      { starItems: [], puzzleItems: [] },
    ]
    expect(countPromotionCandidateItemsInCategories(categories)).toBe(3)
    expect(
      countFilteredPromotionCandidateItemsInCategories(categories, {
        storytellingFit: ['strong'],
        priceLevel: [1, 2, 3],
      }),
    ).toBe(2)
    expect(
      countFilteredPromotionCandidateItemsInCategories(categories, {
        storytellingFit: ['weak'],
        priceLevel: [3],
      }),
    ).toBe(1)
  })
})
