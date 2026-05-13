import type { PromotionCandidateMenuItem } from '@/lib/graphql/node-schemas'

export type StorytellingFitFilter = 'strong' | 'weak'
export type PriceLevelFilter = 1 | 2 | 3

export type PromotionCandidatesPreviewFilters = {
  storytellingFit: StorytellingFitFilter[]
  priceLevel: PriceLevelFilter[]
}

export const DEFAULT_PROMOTION_CANDIDATES_PREVIEW_FILTERS: PromotionCandidatesPreviewFilters = {
  storytellingFit: ['strong', 'weak'],
  priceLevel: [1, 2, 3],
}

const ALL_STORYTELLING_FITS: StorytellingFitFilter[] = ['strong', 'weak']
const ALL_PRICE_LEVELS: PriceLevelFilter[] = [1, 2, 3]

function isStorytellingFilterActive(filters: PromotionCandidatesPreviewFilters): boolean {
  return (
    filters.storytellingFit.length > 0 &&
    filters.storytellingFit.length < ALL_STORYTELLING_FITS.length
  )
}

function isPriceLevelFilterActive(filters: PromotionCandidatesPreviewFilters): boolean {
  return filters.priceLevel.length > 0 && filters.priceLevel.length < ALL_PRICE_LEVELS.length
}

export function hasActivePromotionCandidatesPreviewFilters(
  filters: PromotionCandidatesPreviewFilters,
): boolean {
  return isStorytellingFilterActive(filters) || isPriceLevelFilterActive(filters)
}

export function itemMatchesPromotionCandidatesPreviewFilters(
  item: PromotionCandidateMenuItem,
  filters: PromotionCandidatesPreviewFilters,
): boolean {
  if (
    isStorytellingFilterActive(filters) &&
    !filters.storytellingFit.includes(item.storytellingFit)
  ) {
    return false
  }

  if (isPriceLevelFilterActive(filters)) {
    const priceLevel = 'priceLevel' in item ? item.priceLevel : undefined
    if (priceLevel === undefined || !filters.priceLevel.includes(priceLevel)) {
      return false
    }
  }

  return true
}

export function filterPromotionCandidateItems(
  items: PromotionCandidateMenuItem[],
  filters: PromotionCandidatesPreviewFilters,
): PromotionCandidateMenuItem[] {
  return items.filter((item) => itemMatchesPromotionCandidatesPreviewFilters(item, filters))
}

export type PromotionCandidatesCategoryBucket = {
  starItems: PromotionCandidateMenuItem[]
  puzzleItems: PromotionCandidateMenuItem[]
}

export function countPromotionCandidateItems(items: PromotionCandidateMenuItem[]): number {
  return items.length
}

export function countPromotionCandidateItemsInCategories(
  categories: PromotionCandidatesCategoryBucket[],
): number {
  return categories.reduce(
    (total, bucket) => total + bucket.starItems.length + bucket.puzzleItems.length,
    0,
  )
}

export function countFilteredPromotionCandidateItemsInCategories(
  categories: PromotionCandidatesCategoryBucket[],
  filters: PromotionCandidatesPreviewFilters,
): number {
  return categories.reduce((total, bucket) => {
    return (
      total +
      filterPromotionCandidateItems(bucket.starItems, filters).length +
      filterPromotionCandidateItems(bucket.puzzleItems, filters).length
    )
  }, 0)
}
