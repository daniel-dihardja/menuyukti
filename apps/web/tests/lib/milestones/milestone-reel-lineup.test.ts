import { describe, expect, it } from 'vitest'

import {
  getMilestonePresetCreateFields,
  MILESTONE_PRESET_REGISTRY,
} from '@/lib/milestones/preset-definitions'
import { reelLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'

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
      value: { notes: '' },
    })
    expect(fields.passCriteria?.length).toBe(4)
  })
})
