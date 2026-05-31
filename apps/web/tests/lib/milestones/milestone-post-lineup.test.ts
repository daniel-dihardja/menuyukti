import { describe, expect, it } from 'vitest'

import {
  getMilestonePresetCreateFields,
  MILESTONE_PRESET_REGISTRY,
} from '@/lib/milestones/preset-definitions'
import { postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'

describe('post_lineup preset', () => {
  it('registers preset with empty data schema', () => {
    const parsed = postLineupMilestoneDataSchema.safeParse(
      MILESTONE_PRESET_REGISTRY.post_lineup.emptyData,
    )
    expect(parsed.success).toBe(true)
  })

  it('getMilestonePresetCreateFields seeds post_lineup input', () => {
    const fields = getMilestonePresetCreateFields('post_lineup', (k) => k)
    expect(fields.presetId).toBe('post_lineup')
    expect(fields.milestoneInput).toEqual({
      type: 'post_lineup',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toMatchObject({ posts: [] })
    expect(fields.passCriteria?.length).toBe(5)
  })
})
