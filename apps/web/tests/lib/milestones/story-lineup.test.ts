import { describe, expect, it } from 'vitest'

import { storyLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { EMPTY_STORY_LINEUP_DATA } from '@/lib/milestones/story-lineup'
import { MILESTONE_PRESET_REGISTRY } from '@/lib/milestones/preset-definitions'

describe('storyLineupMilestoneDataSchema', () => {
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
})
