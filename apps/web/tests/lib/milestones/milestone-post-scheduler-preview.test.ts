import { describe, expect, it } from 'vitest'

import { postSchedulerMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { toPromotionCategoryPreviewRows } from '@/app/(protected)/campaigns/_components/milestone-preview/milestone-post-scheduler-data-preview'

describe('post scheduler promotion candidates preview', () => {
  it('schema accepts promotionCandidates payload', () => {
    const parsed = postSchedulerMilestoneDataSchema.safeParse({
      posts: [],
      daySummary: { weekdayCount: 5, weekendCount: 2 },
      promotionCandidates: {
        grouping: 'by_menu_category',
        categories: {
          mains: {
            starItems: ['A', 'B'],
            puzzleItems: ['C'],
          },
        },
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('truncates star and puzzle items to max 5 per category', () => {
    const rows = toPromotionCategoryPreviewRows({
      posts: [],
      daySummary: { weekdayCount: 5, weekendCount: 2 },
      promotionCandidates: {
        grouping: 'by_menu_category',
        categories: {
          drinks: {
            starItems: ['1', '2', '3', '4', '5', '6'],
            puzzleItems: ['a', 'b', 'c', 'd', 'e', 'f'],
          },
        },
      },
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.starItems).toEqual(['1', '2', '3', '4', '5'])
    expect(rows[0]?.puzzleItems).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('maps flat grouping into a single preview row', () => {
    const rows = toPromotionCategoryPreviewRows({
      posts: [],
      daySummary: { weekdayCount: 5, weekendCount: 2 },
      promotionCandidates: {
        grouping: 'flat',
        starItems: ['Nasi Goreng'],
        puzzleItems: ['Sate Ayam'],
      },
    })

    expect(rows).toEqual([
      {
        categoryName: '',
        starItems: ['Nasi Goreng'],
        puzzleItems: ['Sate Ayam'],
      },
    ])
  })
})
