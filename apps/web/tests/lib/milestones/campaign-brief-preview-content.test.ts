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
} as const

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
