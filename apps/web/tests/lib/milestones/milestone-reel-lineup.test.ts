import { describe, expect, it } from 'vitest'

import {
  getMilestonePresetCreateFields,
  MILESTONE_PRESET_REGISTRY,
} from '@/lib/milestones/preset-definitions'
import { milestonedataValueSchema, reelLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { campaignWeeks } from '@/lib/milestones/dates-window'
import { buildReelLineupFromPlan } from '@/lib/milestones/reel-lineup'

const GROUPS = [
  {
    id: 'group-1',
    leadName: 'Ribeye',
    profileId: 'hook_reel' as const,
    anchor: { dimension: 'reel_moment' as const, value: 'static_hero' },
    items: [
      {
        name: 'Ribeye',
        role: 'star' as const,
        category: 'MAINS',
        position: 1,
        storytellingFit: 'strong' as const,
        reelMoment: 'static_hero',
      },
    ],
    mix: {
      priceLevels: [] as (1 | 2 | 3)[],
      storytellingStrongCount: 1,
      starCount: 1,
      puzzleCount: 0,
    },
  },
  {
    id: 'group-2',
    leadName: 'Burger',
    profileId: 'hook_reel' as const,
    anchor: { dimension: 'reel_moment' as const, value: 'static_hero' },
    items: [
      {
        name: 'Burger',
        role: 'star' as const,
        category: 'MAINS',
        position: 1,
        storytellingFit: 'strong' as const,
        reelMoment: 'static_hero',
      },
    ],
    mix: {
      priceLevels: [] as (1 | 2 | 3)[],
      storytellingStrongCount: 1,
      starCount: 1,
      puzzleCount: 0,
    },
  },
]

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
    expect(fields.milestoneData).toMatchObject({ reels: [] })
    expect(fields.passCriteria?.length).toBe(7)
  })

  it('buildReelLineupFromPlan produces two reels per week', () => {
    const startDate = '2026-06-01'
    const endDate = '2026-06-14'
    const weeks = campaignWeeks(startDate, endDate)
    const built = buildReelLineupFromPlan(
      weeks.map((week) => ({
        weekIndex: week.weekIndex,
        weekdayReel: {
          groupId: 'group-1',
          title: `Week ${week.weekIndex} weekday`,
          description: 'Weekday description.',
          explanation: 'Weekday explanation.',
        },
        weekendReel: {
          groupId: 'group-2',
          title: `Week ${week.weekIndex} weekend`,
          description: 'Weekend description.',
          explanation: 'Weekend explanation.',
        },
      })),
      GROUPS,
      { startDate, endDate },
    )
    expect(built.reels).toHaveLength(weeks.length * 2)
    expect(milestonedataValueSchema.safeParse(built).success).toBe(true)
    expect(built.reels.every((reel) => reel.description && reel.explanation)).toBe(true)
  })
})
