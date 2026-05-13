import { describe, expect, it } from 'vitest'

import { extractCampaignBriefMainCategory } from '@/lib/milestones/campaign-brief-main-category'

import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'

describe('extractCampaignBriefMainCategory', () => {
  it('reads mainCategory from the first campaign brief milestone', () => {
    const milestones: TimelineMilestone[] = [
      {
        id: 'brief-1',
        title: 'Campaign brief',
        passCriteria: [],
        presetId: 'restaurant_campaign_brief',
        data: {
          venueSnapshot: { venueName: 'Cafe', city: 'Berlin', country: 'DE', currency: 'EUR' },
          contentPillars: ['A', 'B', 'C'],
          audienceHypotheses: ['A', 'B', 'C'],
          proofOrientedAngles: ['A', 'B', 'C'],
          toneGuardrails: ['A', 'B', 'C'],
          campaignObjective: 'Grow reservations',
          mainCategory: 'Mains',
          targetSegments: ['A', 'B', 'C'],
          messageHierarchy: ['A', 'B', 'C'],
          offerAndCtaPlan: ['A', 'B', 'C'],
          contentPillarPlan: ['A', 'B', 'C'],
          measurementPlan: ['A', 'B', 'C'],
          testingPlan: ['A', 'B', 'C'],
          riskGuardrails: ['A', 'B', 'C'],
        },
      },
      {
        id: 'promo-1',
        title: 'Promotion candidates',
        passCriteria: [],
        presetId: 'promotion_candidates',
      },
    ]

    expect(extractCampaignBriefMainCategory(milestones)).toBe('Mains')
  })

  it('returns null when no campaign brief milestone has data', () => {
    const milestones: TimelineMilestone[] = [
      {
        id: 'promo-1',
        title: 'Promotion candidates',
        passCriteria: [],
        presetId: 'promotion_candidates',
      },
    ]

    expect(extractCampaignBriefMainCategory(milestones)).toBeNull()
  })
})
