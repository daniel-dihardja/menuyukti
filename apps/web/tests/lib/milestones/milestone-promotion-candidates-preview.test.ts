import { describe, expect, it } from 'vitest'

import {
  campaignBriefMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

describe('promotion candidates milestone schema', () => {
  it('accepts at least one valid category block', () => {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse({
      mainCategory: 'FOOD',
      categories: [{ category: 'FOOD', starItems: ['Steak'], puzzleItems: ['Soup'] }],
      sourceAnalyticsRunId: null,
      notes: '',
    })
    expect(parsed.success).toBe(true)
  })

  it('requires at least one category block', () => {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse({
      mainCategory: 'FOOD',
      categories: [],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects unknown category labels', () => {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse({
      mainCategory: 'FOOD',
      categories: [{ category: 'DESSERT', starItems: [], puzzleItems: [] }],
    })
    expect(parsed.success).toBe(false)
  })
})

describe('campaign brief schema', () => {
  it('requires mainCategory for downstream preset ordering', () => {
    const parsed = campaignBriefMilestoneDataSchema.safeParse({
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      publicHolidays: [],
      venueSnapshot: {
        venueName: 'Cafe Alto',
        city: 'Berlin',
        country: 'Germany',
        currency: 'EUR',
      },
      contentPillars: ['A', 'B', 'C'],
      audienceHypotheses: ['A', 'B', 'C'],
      proofOrientedAngles: ['A', 'B', 'C'],
      toneGuardrails: ['A', 'B', 'C'],
      campaignObjective: 'Increase reservations',
      mainCategory: 'DRINK',
      targetSegments: ['A', 'B', 'C'],
      messageHierarchy: ['A', 'B', 'C'],
      offerAndCtaPlan: ['A', 'B', 'C'],
      contentPillarPlan: ['A', 'B', 'C'],
      measurementPlan: ['A', 'B', 'C'],
      testingPlan: ['A', 'B', 'C'],
      riskGuardrails: ['A', 'B', 'C'],
    })
    expect(parsed.success).toBe(true)
  })
})
