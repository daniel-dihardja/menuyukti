import { describe, expect, it } from 'vitest'

import {
  datesMilestoneDataSchema,
  campaignBriefMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

describe('promotion candidates milestone schema', () => {
  it('accepts at least one valid category block', () => {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse({
      mainCategory: 'Mains',
      categories: [{ category: 'Mains', starItems: ['Steak'], puzzleItems: ['Soup'] }],
      sourceAnalyticsRunId: null,
      notes: '',
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    const firstStar = parsed.data.categories[0]?.starItems[0]
    expect(firstStar).toBeDefined()
    expect(firstStar).toMatchObject({
      name: 'Steak',
      storytellingFit: 'strong',
      storytellingRationale: '',
    })
  })

  it('accepts star and puzzle items with storytelling fields', () => {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse({
      mainCategory: 'Mains',
      categories: [
        {
          category: 'Mains',
          starItems: [
            {
              name: 'Steak',
              storytellingFit: 'weak',
              storytellingRationale: 'Too generic for the Ramadan family angle.',
              quantity: 42,
              popularity: 0.123456,
            },
          ],
          puzzleItems: [
            { name: 'Soup', storytellingFit: 'strong', storytellingRationale: 'Comfort story.' },
          ],
        },
      ],
      sourceAnalyticsRunId: '99',
      notes: '',
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    expect(parsed.data.categories[0]?.starItems[0]).toMatchObject({
      quantity: 42,
      popularity: 0.123456,
    })
  })

  it('requires at least one category block', () => {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse({
      mainCategory: 'Mains',
      categories: [],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects unknown category labels', () => {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse({
      mainCategory: 'Mains',
      categories: [{ category: '', starItems: [], puzzleItems: [] }],
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts POS menu category labels', () => {
    const parsed = promotionCandidatesMilestoneDataSchema.safeParse({
      mainCategory: 'Mains',
      categories: [{ category: 'Mains', starItems: ['Steak'], puzzleItems: [] }],
      sourceAnalyticsRunId: null,
      notes: '',
    })
    expect(parsed.success).toBe(true)
  })
})

describe('campaign brief schema', () => {
  it('requires mainCategory for downstream preset ordering', () => {
    const parsed = campaignBriefMilestoneDataSchema.safeParse({
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
      mainCategory: 'Mains',
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

describe('dates schema', () => {
  it('accepts campaign window with holiday list', () => {
    const parsed = datesMilestoneDataSchema.safeParse({
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      publicHolidays: [{ name: 'Holiday A', description: 'National holiday', date: '2026-06-10' }],
    })
    expect(parsed.success).toBe(true)
  })
})
