const MILESTONE_POPULARITY_PERCENT_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Display popularity fractions (0–1) as a percent with two decimal places, e.g. 3.75%. */
export function formatMilestonePopularityPercent(popularity: number): string {
  return MILESTONE_POPULARITY_PERCENT_FORMAT.format(popularity)
}

export type PopularitySortableItem = {
  name?: string
  dishName?: string
  popularity?: number
  storytellingFit?: 'strong' | 'weak'
}

function popularitySortableName(item: PopularitySortableItem): string {
  return (item.name ?? item.dishName ?? '').trim()
}

function popularityRankScore(popularity: number | undefined): number {
  if (typeof popularity !== 'number' || Number.isNaN(popularity)) {
    return Number.POSITIVE_INFINITY
  }
  return -Math.round(popularity * 1_000_000) / 1_000_000
}

function storytellingRank(fit: PopularitySortableItem['storytellingFit']): number {
  return fit === 'strong' ? -1 : 0
}

/** Match agents menu_clusterer `_food_sort_key` ordering for milestone previews. */
export function compareByPopularityDesc(
  a: PopularitySortableItem,
  b: PopularitySortableItem,
): number {
  const popDiff = popularityRankScore(a.popularity) - popularityRankScore(b.popularity)
  if (popDiff !== 0) {
    return popDiff
  }
  const storyDiff = storytellingRank(a.storytellingFit) - storytellingRank(b.storytellingFit)
  if (storyDiff !== 0) {
    return storyDiff
  }
  return popularitySortableName(a).localeCompare(popularitySortableName(b), undefined, {
    sensitivity: 'base',
  })
}

export function sortByPopularityDesc<T extends PopularitySortableItem>(items: readonly T[]): T[] {
  return [...items].sort(compareByPopularityDesc)
}
