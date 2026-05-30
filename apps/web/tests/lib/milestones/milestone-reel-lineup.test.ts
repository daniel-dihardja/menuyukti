import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  getMilestonePresetCreateFields,
  MILESTONE_PRESET_REGISTRY,
} from '@/lib/milestones/preset-definitions'
import { reelLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import {
  normalizeReelLineupInput,
  reelLineupInputFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'

describe('reel_lineup preset', () => {
  it('registers preset with empty data schema', () => {
    const parsed = reelLineupMilestoneDataSchema.safeParse(
      MILESTONE_PRESET_REGISTRY.reel_lineup.emptyData,
    )
    expect(parsed.success).toBe(true)
  })

  it('getMilestonePresetCreateFields seeds reel_lineup input', () => {
    const fields = getMilestonePresetCreateFields('reel_lineup', (k) => k)
    expect(fields.presetId).toBe('reel_lineup')
    expect(fields.milestoneInput).toEqual({
      type: 'reel_lineup',
      value: { notes: '', targetGroupCount: 4 },
    })
    expect(fields.milestoneData).toMatchObject({
      foodLeads: [],
      drinkLeads: [],
    })
    expect(fields.passCriteria?.map((row) => row.requirement)).toEqual([
      'milestonePreset.reel_lineup.criterionPriorCampaignBrief',
      'milestonePreset.reel_lineup.criterionPriorMenuTagger',
      'milestonePreset.reel_lineup.criterionHookGroupCount',
      'milestonePreset.reel_lineup.criterionTopFiveLead',
      'milestonePreset.reel_lineup.criterionClusterDescription',
      'milestonePreset.reel_lineup.criterionSchedulingHints',
    ])
  })

  it('reelLineupInputFromMilestoneInput reads notes and targetGroupCount', () => {
    expect(
      reelLineupInputFromMilestoneInput({
        type: 'reel_lineup',
        value: { notes: 'focus mains', targetGroupCount: 6 },
      }),
    ).toEqual({ notes: 'focus mains', targetGroupCount: 6 })
    expect(
      reelLineupInputFromMilestoneInput({
        type: 'reel_lineup',
        value: { notes: 'legacy only' },
      }),
    ).toEqual({ notes: 'legacy only', targetGroupCount: 4 })
    expect(normalizeReelLineupInput({ notes: '  hi ', targetGroupCount: 8 })).toEqual({
      notes: 'hi',
      targetGroupCount: 8,
    })
  })

  it('patchMilestoneSchema accepts reel_lineup milestoneInput with targetGroupCount', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: {
        type: 'reel_lineup',
        value: { notes: 'seasonal', targetGroupCount: 5 },
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'reel_lineup',
        value: { notes: 'seasonal', targetGroupCount: 5 },
      })
    }
  })
})
