import { describe, expect, it } from 'vitest'

import { postSchedulerMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { toPromotionCategoryPreviewRows } from '@/app/(protected)/campaigns/_components/milestone-preview/milestone-post-scheduler-data-preview'

describe('post scheduler promotion candidates preview', () => {
  it('schema accepts promotionCandidates payload', () => {
    const parsed = postSchedulerMilestoneDataSchema.safeParse({
      dateConcepts: [],
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
      dateConcepts: [],
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
      dateConcepts: [],
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

  it('schema accepts date-centric concepts payload', () => {
    const parsed = postSchedulerMilestoneDataSchema.safeParse({
      daySummary: { weekdayCount: 1, weekendCount: 1 },
      dateConcepts: [
        {
          date: '2026-06-01',
          dayOfWeek: 'Monday',
          format: 'Reel',
          formatReason: 'Reel boosts discovery for kickoff content.',
          conceptInstruction: 'Feature lunch conversion concept with clear reservation CTA.',
          relevanceDescription: 'Matches weekday lunch intent and drives midweek covers.',
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })
})
