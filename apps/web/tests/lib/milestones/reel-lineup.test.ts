import { describe, expect, it } from 'vitest'

import type { MenuTaggerItem, PromotionCandidatesMilestoneData } from '@/lib/graphql/node-schemas'
import { reelLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import {
  REEL_LINEUP_GROUP_MAX_SIZE,
  REEL_LINEUP_GROUP_MIN_SIZE,
} from '@/lib/milestones/reel-lineup-rules'
import {
  buildReelLineup,
  indexPromotionCandidateItems,
  promotionCandidateItemKey,
} from '@/lib/milestones/reel-lineup'

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

function item(
  name: string,
  role: 'star' | 'puzzle',
  tags: MenuTaggerItem['tags'],
  category = 'MAINS',
): MenuTaggerItem {
  return { name, role, category, tags }
}

function promotionData(
  entries: Array<{
    name: string
    role: 'star' | 'puzzle'
    category?: string
    popularity?: number
    priceLevel?: 1 | 2 | 3
    storytellingFit?: 'strong' | 'weak'
  }>,
): PromotionCandidatesMilestoneData {
  const starItems: PromotionCandidatesMilestoneData['categories'][0]['starItems'] = []
  const puzzleItems: PromotionCandidatesMilestoneData['categories'][0]['puzzleItems'] = []
  for (const entry of entries) {
    const row = {
      name: entry.name,
      storytellingFit: entry.storytellingFit ?? 'weak',
      storytellingRationale: '',
      popularity: entry.popularity,
      priceLevel: entry.priceLevel,
    }
    if (entry.role === 'star') {
      starItems.push(row)
    } else {
      puzzleItems.push(row)
    }
  }
  return {
    mainCategory: 'MAINS',
    categories: [{ category: 'MAINS', starItems, puzzleItems }],
  }
}

describe('indexPromotionCandidateItems', () => {
  it('indexes by name role and category', () => {
    const index = indexPromotionCandidateItems(
      promotionData([{ name: 'Burger', role: 'star', popularity: 0.8 }]),
    )
    expect(index.size).toBe(1)
    expect(index.get(promotionCandidateItemKey('Burger', 'star', 'MAINS'))?.name).toBe('Burger')
  })
})

describe('buildReelLineup', () => {
  const sharedMoment = tag({ reel_moment: 'sizzle', prep_style: ['grilled'] })

  it('creates groups of 3–5 with star lead and shared reel_moment', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Ribeye', 'star', sharedMoment),
      item('Burger', 'star', { ...sharedMoment, ingredient: ['bread'] }),
      item('Wings', 'puzzle', { ...sharedMoment, ingredient: ['poultry'] }),
      item('Salad', 'puzzle', {
        ...sharedMoment,
        ingredient: ['vegetable'],
        content_angle: ['hidden_gem'],
      }),
    ]
    const result = buildReelLineup({
      menuTaggerItems,
      promotionCandidates: promotionData([
        { name: 'Ribeye', role: 'star', popularity: 0.9, storytellingFit: 'strong', priceLevel: 3 },
        { name: 'Burger', role: 'star', popularity: 0.7, priceLevel: 2 },
        { name: 'Wings', role: 'puzzle', popularity: 0.4, priceLevel: 2 },
        {
          name: 'Salad',
          role: 'puzzle',
          popularity: 0.3,
          priceLevel: 1,
          storytellingFit: 'strong',
        },
      ]),
    })

    expect(result.groups.length).toBeGreaterThanOrEqual(1)
    for (const group of result.groups) {
      expect(group.items.length).toBeGreaterThanOrEqual(REEL_LINEUP_GROUP_MIN_SIZE)
      expect(group.items.length).toBeLessThanOrEqual(REEL_LINEUP_GROUP_MAX_SIZE)
      expect(group.items[0]?.role).toBe('star')
      expect(group.leadName).toBe(group.items[0]?.name)
      const moments = new Set(group.items.map((row) => row.reelMoment))
      expect(moments.size).toBe(1)
      expect(group.anchor.value).toBe('sizzle')
    }
    expect(reelLineupMilestoneDataSchema.safeParse(result).success).toBe(true)
  })

  it('ranks higher-popularity star as lead in its group', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Burger', 'star', sharedMoment),
      item('Ribeye', 'star', sharedMoment),
      item('Wings', 'puzzle', { ...sharedMoment, ingredient: ['poultry'] }),
      item('Fries', 'puzzle', {
        ...sharedMoment,
        ingredient: ['vegetable'],
        content_angle: ['hidden_gem'],
      }),
    ]
    const result = buildReelLineup({
      menuTaggerItems,
      promotionCandidates: promotionData([
        { name: 'Burger', role: 'star', popularity: 0.5, priceLevel: 2 },
        {
          name: 'Ribeye',
          role: 'star',
          popularity: 0.95,
          storytellingFit: 'strong',
          priceLevel: 3,
        },
        { name: 'Wings', role: 'puzzle', popularity: 0.4, priceLevel: 2 },
        { name: 'Fries', role: 'puzzle', popularity: 0.3, priceLevel: 1 },
      ]),
    })

    const ribeyeGroup = result.groups.find((group) => group.leadName === 'Ribeye')
    expect(ribeyeGroup).toBeDefined()
    expect(ribeyeGroup?.items[0]?.name).toBe('Ribeye')
  })

  it('ranks all star items before puzzle items within a group', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Ribeye', 'star', sharedMoment),
      item('Burger', 'star', { ...sharedMoment, ingredient: ['bread'] }),
      item('Wings', 'puzzle', { ...sharedMoment, ingredient: ['poultry'] }),
      item('Salad', 'puzzle', {
        ...sharedMoment,
        ingredient: ['vegetable'],
        content_angle: ['hidden_gem'],
      }),
    ]
    const result = buildReelLineup({
      menuTaggerItems,
      promotionCandidates: promotionData([
        { name: 'Ribeye', role: 'star', popularity: 0.9, storytellingFit: 'strong', priceLevel: 3 },
        { name: 'Burger', role: 'star', popularity: 0.7, priceLevel: 2 },
        {
          name: 'Wings',
          role: 'puzzle',
          popularity: 0.9,
          priceLevel: 2,
          storytellingFit: 'strong',
        },
        {
          name: 'Salad',
          role: 'puzzle',
          popularity: 0.8,
          priceLevel: 1,
          storytellingFit: 'strong',
        },
      ]),
    })

    for (const group of result.groups) {
      const firstPuzzleIndex = group.items.findIndex((row) => row.role === 'puzzle')
      if (firstPuzzleIndex === -1) continue
      const starsAfterPuzzle = group.items
        .slice(firstPuzzleIndex + 1)
        .some((row) => row.role === 'star')
      expect(starsAfterPuzzle).toBe(false)
    }
  })

  it('leaves undersized clusters unassigned', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Solo Star', 'star', tag({ reel_moment: 'static_hero' })),
    ]
    const result = buildReelLineup({
      menuTaggerItems,
      promotionCandidates: promotionData([{ name: 'Solo Star', role: 'star', popularity: 0.2 }]),
    })
    expect(result.groups).toHaveLength(0)
    expect(result.unassignedItemNames).toContain('Solo Star')
  })
})
