import { describe, expect, it } from 'vitest'

import type { MenuClustererGroup, MenuTaggerItem } from '@/lib/graphql/node-schemas'
import { postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { buildPostLineupFromPlan } from '@/lib/milestones/post-lineup'

function tag(
  overrides: Partial<MenuTaggerItem['tags']> & Pick<MenuTaggerItem['tags'], 'reel_moment'>,
): MenuTaggerItem['tags'] {
  return {
    kind: 'food',
    ingredient: ['meat'],
    taste: ['savory'],
    course: ['main'],
    texture: ['juicy'],
    prep_style: ['grilled'],
    occasion: ['dinner'],
    serve_temp: 'hot',
    content_angle: [],
    ...overrides,
  }
}

function foodLead(name: string, reelMoment = 'sizzle'): MenuTaggerItem {
  return {
    name,
    role: 'star',
    category: 'MAINS',
    tags: tag({ reel_moment: reelMoment }),
    storytellingFit: 'strong',
    storytellingRationale: '',
  }
}

function group(id: string, name: string, reelMoment = 'sizzle'): MenuClustererGroup {
  return {
    id,
    leadName: name,
    profileId: 'hook_reel',
    anchor: { dimension: 'reel_moment', value: reelMoment },
    items: [
      {
        name,
        role: 'star',
        category: 'MAINS',
        position: 1,
        storytellingFit: 'strong',
        reelMoment,
      },
    ],
    mix: {
      priceLevels: [],
      storytellingStrongCount: 1,
      starCount: 1,
      puzzleCount: 0,
    },
  }
}

describe('buildPostLineupFromPlan', () => {
  it('creates two carousel posts from group plans', () => {
    const result = buildPostLineupFromPlan(
      {
        intent: 'pinned_monthly_menu',
        title: 'Monthly signature menu',
        groupIds: ['group-1', 'group-2'],
      },
      {
        intent: 'weekday_lunch_post',
        title: 'Weekday lunch offer',
        groupIds: ['group-1'],
      },
      [group('group-1', 'Ribeye'), group('group-2', 'Burger', 'stack')],
      [foodLead('Ribeye'), foodLead('Burger', 'stack')],
      {
        sourceMenuClustererTitle: 'Menu clusterer',
        sourceCampaignBriefTitle: 'Campaign brief',
      },
    )

    expect(result.posts).toHaveLength(2)
    expect(result.posts[0]?.intent).toBe('pinned_monthly_menu')
    expect(result.posts[1]?.intent).toBe('weekday_lunch_post')
    expect(result.posts[0]?.slides).toHaveLength(2)
    expect(result.posts[0]?.slides[0]?.dishName).toBe('Ribeye')
    expect(result.posts[1]?.scheduleHints?.preferredWeekdays).toEqual(['tuesday'])
    expect(result.sourceMenuClustererTitle).toBe('Menu clusterer')
    expect(result.sourceCampaignBriefTitle).toBe('Campaign brief')
    expect(postLineupMilestoneDataSchema.safeParse(result).success).toBe(true)
  })

  it('throws when groups are empty', () => {
    expect(() =>
      buildPostLineupFromPlan(
        {
          intent: 'pinned_monthly_menu',
          title: 'Monthly signature menu',
          groupIds: ['group-1'],
        },
        {
          intent: 'weekday_lunch_post',
          title: 'Weekday lunch offer',
          groupIds: ['group-1'],
        },
        [],
        [foodLead('Ribeye')],
      ),
    ).toThrow(/group/i)
  })
})
