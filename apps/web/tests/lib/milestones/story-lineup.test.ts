import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  milestonedataValueSchema,
  storyLineupMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'
import { EMPTY_STORY_LINEUP_DATA } from '@/lib/milestones/story-lineup'
import {
  getMilestonePresetCreateFields,
  MILESTONE_PRESET_REGISTRY,
} from '@/lib/milestones/preset-definitions'

describe('storyLineupMilestoneDataSchema', () => {
  it('accepts user_review stories with intervalWeeks', () => {
    const parsed = storyLineupMilestoneDataSchema.safeParse({
      stories: [
        {
          id: 'story-user-review',
          title: 'Story: positive customer review',
          fixdate: false,
          reason: 'user_review',
          intervalWeeks: 4,
          time: '14:00',
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts public-holiday stories with fixdate and date', () => {
    const parsed = storyLineupMilestoneDataSchema.safeParse({
      stories: [
        {
          id: 'story-public-holiday-2026-06-15-easter-sunday',
          title: 'Story: sending happy Easter Sunday',
          date: '2026-06-15',
          fixdate: true,
          reason: 'public_holiday',
          holidayName: 'Easter Sunday',
        },
      ],
      sourceDatesTitle: 'Dates',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects fixdate without date', () => {
    const parsed = storyLineupMilestoneDataSchema.safeParse({
      stories: [
        {
          id: 'story-1',
          title: 'Story: greeting',
          fixdate: true,
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })
})

describe('story_lineup preset registry', () => {
  it('registers story_lineup preset with empty stories data', () => {
    const def = MILESTONE_PRESET_REGISTRY.story_lineup
    expect(def.id).toBe('story_lineup')
    expect(def.emptyData).toEqual(EMPTY_STORY_LINEUP_DATA)
  })

  it('getMilestonePresetCreateFields seeds story_lineup input', () => {
    const fields = getMilestonePresetCreateFields('story_lineup', (k) => k)
    expect(fields.presetId).toBe('story_lineup')
    expect(fields.milestoneInput).toEqual({
      type: 'story_lineup',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual(EMPTY_STORY_LINEUP_DATA)
    expect(fields.passCriteria?.length).toBe(4)
  })

  it('milestonedataValueSchema accepts empty story_lineup data for milestone run', () => {
    const parsed = milestonedataValueSchema.safeParse(EMPTY_STORY_LINEUP_DATA)
    expect(parsed.success).toBe(true)
  })

  it('patchMilestoneSchema accepts story_lineup milestoneData and input', () => {
    const fields = getMilestonePresetCreateFields('story_lineup', (k) => k)
    const parsed = patchMilestoneSchema.safeParse({
      presetId: fields.presetId,
      milestoneData: fields.milestoneData,
      milestoneInput: fields.milestoneInput,
    })
    expect(parsed.success).toBe(true)
  })
})
