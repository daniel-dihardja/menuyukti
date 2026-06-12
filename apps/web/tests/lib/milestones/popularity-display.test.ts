import { describe, expect, it } from 'vitest'

import {
  formatMilestonePopularityPercent,
  sortByPopularityDesc,
} from '@/lib/milestones/popularity-display'

describe('formatMilestonePopularityPercent', () => {
  it('formats with two fractional digits', () => {
    expect(formatMilestonePopularityPercent(0.0375)).toBe('3.75%')
    expect(formatMilestonePopularityPercent(0.09)).toBe('9.00%')
    expect(formatMilestonePopularityPercent(0.123456)).toBe('12.35%')
  })

  it('distinguishes nearby values that round to the same whole percent', () => {
    expect(formatMilestonePopularityPercent(0.034)).toBe('3.40%')
    expect(formatMilestonePopularityPercent(0.036)).toBe('3.60%')
  })
})

describe('sortByPopularityDesc', () => {
  it('orders by popularity descending with storytelling and name tie-breaks', () => {
    const sorted = sortByPopularityDesc([
      { name: 'Burger', popularity: 0.09, storytellingFit: 'strong' },
      { name: 'Wings', popularity: 0.05 },
      { name: 'Ribeye', popularity: 0.09, storytellingFit: 'strong' },
    ])
    expect(sorted.map((item) => item.name)).toEqual(['Burger', 'Ribeye', 'Wings'])
  })
})
