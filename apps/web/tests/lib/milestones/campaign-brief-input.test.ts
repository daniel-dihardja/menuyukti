import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  campaignBriefInputFromMilestoneInput,
  DEFAULT_CAMPAIGN_BRIEF_REFLECTION,
  normalizeCampaignBriefInput,
  normalizedCampaignBriefInputsEqual,
} from '@/lib/milestones/campaign-brief-input'
import { getMilestonePresetCreateFields } from '@/lib/milestones/preset-definitions'

describe('campaign brief input', () => {
  it('defaults reflection when legacy notes-only payload', () => {
    expect(campaignBriefInputFromMilestoneInput(undefined)).toEqual({
      notes: '',
      reflection: { ...DEFAULT_CAMPAIGN_BRIEF_REFLECTION },
    })
    expect(
      campaignBriefInputFromMilestoneInput({
        type: 'restaurant_campaign_brief',
        value: { notes: 'brunch focus' },
      }),
    ).toEqual({
      notes: 'brunch focus',
      reflection: { enabled: true, maxRevisions: 2 },
    })
  })

  it('reads explicit reflection settings', () => {
    expect(
      campaignBriefInputFromMilestoneInput({
        type: 'restaurant_campaign_brief',
        value: {
          notes: 'tone',
          reflection: { enabled: false, maxRevisions: 1 },
        },
      }),
    ).toEqual({
      notes: 'tone',
      reflection: { enabled: false, maxRevisions: 1 },
    })
  })

  it('normalizeCampaignBriefInput clamps maxRevisions', () => {
    expect(
      normalizeCampaignBriefInput({
        notes: '  hello  ',
        reflection: { enabled: true, maxRevisions: 9 },
      }),
    ).toEqual({
      notes: 'hello',
      reflection: { enabled: true, maxRevisions: 3 },
    })
  })

  it('normalizedCampaignBriefInputsEqual compares reflection fields', () => {
    const a = normalizeCampaignBriefInput({
      notes: 'x',
      reflection: { enabled: true, maxRevisions: 2 },
    })
    const b = normalizeCampaignBriefInput({
      notes: 'x',
      reflection: { enabled: false, maxRevisions: 2 },
    })
    expect(normalizedCampaignBriefInputsEqual(a, a)).toBe(true)
    expect(normalizedCampaignBriefInputsEqual(a, b)).toBe(false)
  })

  it('getMilestonePresetCreateFields seeds reflection defaults', () => {
    const fields = getMilestonePresetCreateFields('restaurant_campaign_brief', (k) => k)
    expect(fields.milestoneInput).toEqual({
      type: 'restaurant_campaign_brief',
      value: {
        notes: '',
        reflection: { enabled: true, maxRevisions: 2 },
      },
    })
  })

  it('patchMilestoneSchema accepts reflection payload', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: {
        type: 'restaurant_campaign_brief',
        value: {
          notes: 'seasonal',
          reflection: { enabled: true, maxRevisions: 2 },
        },
      },
    })
    expect(parsed.success).toBe(true)
  })
})
