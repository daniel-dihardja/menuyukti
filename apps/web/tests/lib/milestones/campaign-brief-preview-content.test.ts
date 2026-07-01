import { describe, expect, it } from 'vitest'

import {
  hasCampaignBriefOverallStrategyContent,
  hasCampaignBriefPreviewContent,
  hasCampaignBriefVenueSnapshotContent,
} from '@/lib/milestones/campaign-brief-preview-content'

const emptyBrief = {
  venueSnapshot: { venueName: '', city: '', country: '', currency: '' },
  contentPillars: [],
  audienceHypotheses: [],
  proofOrientedAngles: [],
  toneGuardrails: [],
  campaignObjective: '',
  mainCategory: '(uncategorized)',
  targetSegments: [],
  messageHierarchy: [],
  offerAndCtaPlan: [],
  contentPillarPlan: [],
  measurementPlan: [],
  testingPlan: [],
  riskGuardrails: [],
}

describe('hasCampaignBriefPreviewContent', () => {
  it('returns false for seeded empty brief before a run', () => {
    expect(hasCampaignBriefPreviewContent(emptyBrief)).toBe(false)
  })

  it('returns true when venue snapshot is populated', () => {
    expect(
      hasCampaignBriefPreviewContent({
        ...emptyBrief,
        venueSnapshot: { venueName: 'Cafe Alto', city: '', country: '', currency: '' },
      }),
    ).toBe(true)
  })

  it('returns true when a list field has entries', () => {
    expect(
      hasCampaignBriefPreviewContent({
        ...emptyBrief,
        contentPillars: ['Brunch'],
      }),
    ).toBe(true)
  })

  it('returns true when slot performance is populated', () => {
    expect(
      hasCampaignBriefPreviewContent({
        ...emptyBrief,
        slotPerformance: {
          sourceAnalyticsRunId: '42',
          slots: [
            {
              day: 'fri',
              mealPeriod: 'dinner',
              mealPeriodLabel: 'Dinner',
              mealPeriodHoursLabel: '17:00–21:59',
              orderCount: 10,
              demandIndex: 1.2,
              relativeDemand: 'high',
              posture: 'support',
            },
          ],
          strongSlots: ['Fri Dinner (1.20×)'],
          slotsNeedingPromotion: [],
          summary: '1 strong slot(s), 0 slot(s) needing promotion, 0 average.',
        },
      }),
    ).toBe(true)
  })

  it('ignores placeholder main category alone', () => {
    expect(
      hasCampaignBriefPreviewContent({
        ...emptyBrief,
        mainCategory: '(uncategorized)',
      }),
    ).toBe(false)
  })
})

describe('hasCampaignBriefVenueSnapshotContent', () => {
  it('returns false when all venue fields are blank', () => {
    expect(hasCampaignBriefVenueSnapshotContent(emptyBrief.venueSnapshot)).toBe(false)
  })
})

describe('hasCampaignBriefOverallStrategyContent', () => {
  it('returns false when overall strategy is missing', () => {
    expect(hasCampaignBriefOverallStrategyContent(undefined)).toBe(false)
  })
})
