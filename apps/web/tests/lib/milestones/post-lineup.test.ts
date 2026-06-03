import { describe, expect, it } from 'vitest'

import type { MenuClustererGroup, MenuTaggerItem } from '@/lib/graphql/node-schemas'
import { postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { campaignWeeks } from '@/lib/milestones/dates-window'
import { buildPostLineupFromPlan } from '@/lib/milestones/post-lineup'

const START_DATE = '2026-06-01'
const END_DATE = '2026-06-30'

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

function foodLead(
  name: string,
  reelMoment: MenuTaggerItem['tags']['reel_moment'] = 'sizzle',
): MenuTaggerItem {
  return {
    name,
    role: 'star',
    category: 'MAINS',
    tags: tag({ reel_moment: reelMoment }),
    storytellingFit: 'strong',
    storytellingRationale: '',
  }
}

function group(
  id: string,
  name: string,
  reelMoment: MenuTaggerItem['tags']['reel_moment'] = 'sizzle',
): MenuClustererGroup {
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
        popularity: 0.82,
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
  it('creates monthly and weekly carousel posts for each campaign week', () => {
    const weeks = campaignWeeks(START_DATE, END_DATE)
    const result = buildPostLineupFromPlan(
      {
        intent: 'pinned_monthly_menu',
        title: 'Monthly signature menu',
        groupIds: ['group-1', 'group-2'],
      },
      weeks.map((week) => ({
        weekIndex: week.weekIndex,
        intent: 'weekday_lunch_post',
        title: `Week ${week.weekIndex} lunch offer`,
        groupIds: ['group-1'],
      })),
      [group('group-1', 'Ribeye'), group('group-2', 'Burger', 'layer_build')],
      [foodLead('Ribeye'), foodLead('Burger', 'layer_build')],
      {
        startDate: START_DATE,
        endDate: END_DATE,
        sourceMenuClustererTitle: 'Menu clusterer',
        sourceCampaignBriefTitle: 'Campaign brief',
        sourceDatesTitle: 'Campaign dates',
      },
    )

    expect(result.posts).toHaveLength(1 + weeks.length)
    expect(result.posts[0]?.intent).toBe('pinned_monthly_menu')
    const weeklyPosts = result.posts.filter((post) => post.intent === 'weekday_lunch_post')
    expect(weeklyPosts).toHaveLength(weeks.length)
    expect(weeklyPosts.every((post) => post.fixdate !== true)).toBe(true)
    expect(weeklyPosts.every((post) => !post.date)).toBe(true)
    expect(result.startDate).toBe(START_DATE)
    expect(result.endDate).toBe(END_DATE)
    expect(result.sourceDatesTitle).toBe('Campaign dates')
    expect(postLineupMilestoneDataSchema.safeParse(result).success).toBe(true)
    const monthlySlides = result.posts[0]?.slides ?? []
    expect(monthlySlides[0]?.storytellingFit).toBe('strong')
    expect(monthlySlides[0]?.popularity).toBe(0.82)
  })

  it('passes through description and captionGuidance when provided', () => {
    const weeks = campaignWeeks(START_DATE, END_DATE)
    const result = buildPostLineupFromPlan(
      {
        intent: 'pinned_monthly_menu',
        title: 'Monthly signature menu',
        groupIds: ['group-1'],
        description: 'Monthly pin concept summary.',
        captionGuidance: 'Lead with hero mains and a reservation CTA.',
      },
      weeks.map((week) => ({
        weekIndex: week.weekIndex,
        intent: 'weekday_lunch_post',
        title: `Week ${week.weekIndex} lunch offer`,
        groupIds: ['group-1'],
        description: `Lunch concept for week ${week.weekIndex}.`,
        captionGuidance: 'Keep copy concise; mention lunch offer window.',
      })),
      [group('group-1', 'Ribeye')],
      [foodLead('Ribeye')],
      { startDate: START_DATE, endDate: END_DATE },
    )

    expect(result.posts[0]?.description).toBe('Monthly pin concept summary.')
    expect(result.posts[0]?.captionGuidance).toBe('Lead with hero mains and a reservation CTA.')
    const weekly = result.posts.find((post) => post.intent === 'weekday_lunch_post')
    expect(weekly?.description).toContain('Lunch concept')
    expect(weekly?.captionGuidance).toContain('lunch offer window')
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
        [
          {
            weekIndex: 1,
            intent: 'weekday_lunch_post',
            title: 'Weekday lunch offer',
            groupIds: ['group-1'],
          },
        ],
        [],
        [foodLead('Ribeye')],
        { startDate: START_DATE, endDate: END_DATE },
      ),
    ).toThrow(/group/i)
  })

  it('parsePostLineupMilestoneDataOrNull returns null for missing or invalid payloads', async () => {
    const { parsePostLineupMilestoneDataOrNull } = await import('@/lib/milestones/post-lineup')

    expect(parsePostLineupMilestoneDataOrNull(null)).toBeNull()
    expect(parsePostLineupMilestoneDataOrNull(undefined)).toBeNull()
    expect(parsePostLineupMilestoneDataOrNull({ posts: [{ id: 'bad' }] })).toBeNull()
  })

  it('parsePostLineupMilestoneDataOrNull accepts valid persisted payload', async () => {
    const { buildPostLineupFromPlan, parsePostLineupMilestoneDataOrNull } =
      await import('@/lib/milestones/post-lineup')
    const weeks = campaignWeeks(START_DATE, END_DATE)
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
      [group('group-1', 'Ribeye')],
      [foodLead('Ribeye')],
      { startDate: START_DATE, endDate: END_DATE },
    )

    expect(parsePostLineupMilestoneDataOrNull(built)?.posts.length).toBe(1 + weeks.length)
  })
})
