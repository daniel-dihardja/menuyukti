import { describe, expect, it } from 'vitest'

import {
  getMilestonePresetCreateFields,
  MILESTONE_PRESET_REGISTRY,
} from '@/lib/milestones/preset-definitions'
import { milestonedataValueSchema, postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { campaignWeeks } from '@/lib/milestones/dates-window'
import { buildPostLineupFromPlan } from '@/lib/milestones/post-lineup'

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
    expect(fields.passCriteria?.length).toBe(7)
  })

  it('milestonedataValueSchema accepts built Thursday weekly posts for milestone run', () => {
    const startDate = '2026-06-01'
    const endDate = '2026-06-30'
    const weeks = campaignWeeks(startDate, endDate)
    const built = buildPostLineupFromPlan(
      {
        intent: 'pinned_monthly_menu',
        title: 'Monthly signature menu',
        groupIds: ['group-1'],
      },
      weeks.map((week) => ({
        weekIndex: week.weekIndex,
        intent: 'weekday_lunch_post' as const,
        title: `Week ${week.weekIndex} lunch offer`,
        groupIds: ['group-1'],
      })),
      [
        {
          id: 'group-1',
          leadName: 'Ribeye',
          profileId: 'hook_reel',
          anchor: { dimension: 'reel_moment', value: 'sizzle' },
          items: [
            {
              name: 'Ribeye',
              role: 'star',
              category: 'MAINS',
              position: 1,
              storytellingFit: 'strong',
              reelMoment: 'sizzle',
            },
          ],
          mix: {
            priceLevels: [],
            storytellingStrongCount: 1,
            starCount: 1,
            puzzleCount: 0,
          },
        },
      ],
      [
        {
          name: 'Ribeye',
          role: 'star',
          category: 'MAINS',
          tags: {
            kind: 'food',
            ingredient: ['meat'],
            taste: ['savory'],
            course: ['main'],
            reel_moment: 'sizzle',
            texture: ['juicy'],
            prep_style: ['grilled'],
            occasion: ['dinner'],
            serve_temp: 'hot',
            content_angle: [],
          },
          storytellingFit: 'strong',
          storytellingRationale: '',
        },
      ],
      { startDate, endDate },
    )

    expect(weeks[0]?.postDate).toBe('2026-06-04')
    expect(milestonedataValueSchema.safeParse(built).success).toBe(true)
    expect(milestonedataValueSchema.nullish().safeParse(null).success).toBe(true)
  })
})
