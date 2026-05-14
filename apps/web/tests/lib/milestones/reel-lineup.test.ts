import { describe, expect, it } from 'vitest'

import type { MenuTaggerItem } from '@/lib/graphql/node-schemas'
import { reelLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import {
  REEL_LINEUP_MAX_DRINK_LEADS,
  REEL_LINEUP_MAX_LEADS,
} from '@/lib/milestones/reel-lineup-rules'
import { buildReelLineup } from '@/lib/milestones/reel-lineup'

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

function drinkTag(overrides?: Partial<MenuTaggerItem['tags']>): MenuTaggerItem['tags'] {
  return {
    kind: 'drink',
    ingredient: ['coffee'],
    taste: ['sweet'],
    course: ['beverage'],
    reel_moment: 'pour',
    texture: ['silky'],
    prep_style: ['blended'],
    occasion: ['dinner'],
    serve_temp: 'cold',
    content_angle: [],
    ...overrides,
  }
}

function item(
  name: string,
  role: 'star' | 'puzzle',
  tags: MenuTaggerItem['tags'],
  extra?: Partial<MenuTaggerItem>,
  category = 'MAINS',
): MenuTaggerItem {
  return {
    name,
    role,
    category,
    tags,
    storytellingFit: 'weak',
    storytellingRationale: '',
    ...extra,
  }
}

describe('buildReelLineup', () => {
  it('creates one hook group per qualifying main with strong storytelling', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Ribeye', 'star', tag({ reel_moment: 'sizzle' }), {
        storytellingFit: 'strong',
        popularity: 0.9,
      }),
      item('Burger', 'star', tag({ reel_moment: 'sizzle' }), {
        storytellingFit: 'strong',
        popularity: 0.7,
      }),
      item('Wings', 'puzzle', tag({ reel_moment: 'sizzle' }), {
        storytellingFit: 'weak',
        popularity: 0.95,
      }),
    ]

    const result = buildReelLineup(menuTaggerItems)

    expect(result.foodLeads).toHaveLength(2)
    expect(result.foodLeads[0]?.name).toBe('Ribeye')
    expect(result.foodLeads[1]?.name).toBe('Burger')
    expect(result.groups).toHaveLength(2)
    expect(result.groups[0]?.leadName).toBe('Ribeye')
    expect(result.groups[1]?.leadName).toBe('Burger')
    for (const group of result.groups) {
      expect(group.items).toHaveLength(1)
      expect(group.items[0]?.position).toBe(1)
      expect(group.items[0]?.storytellingFit).toBe('strong')
    }
    expect(result.unassignedItemNames).toContain('Wings')
    expect(reelLineupMilestoneDataSchema.safeParse(result).success).toBe(true)
  })

  it('preserves menu tagger order and caps at five leads', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Nasi Nona', 'star', tag({ reel_moment: 'sizzle' }), {
        storytellingFit: 'strong',
        popularity: 0.2,
      }),
      item('Nasi Goreng Rumahan', 'star', tag({ reel_moment: 'toss_stir' }), {
        storytellingFit: 'strong',
        popularity: 0.9,
      }),
      item('Laksa Nona', 'star', tag({ reel_moment: 'steam' }), {
        storytellingFit: 'strong',
        popularity: 0.95,
      }),
      ...Array.from({ length: 5 }, (_, index) =>
        item(`Extra ${index + 1}`, 'star', tag({ reel_moment: 'sizzle' }), {
          storytellingFit: 'strong',
        }),
      ),
    ]

    const result = buildReelLineup(menuTaggerItems)

    expect(result.foodLeads).toHaveLength(REEL_LINEUP_MAX_LEADS)
    expect(result.foodLeads.map((lead) => lead.name)).toEqual([
      'Nasi Nona',
      'Nasi Goreng Rumahan',
      'Laksa Nona',
      'Extra 1',
      'Extra 2',
    ])
    expect(result.groups).toHaveLength(REEL_LINEUP_MAX_LEADS)
    expect(result.groups.map((group) => group.leadName)).toEqual([
      'Nasi Nona',
      'Nasi Goreng Rumahan',
      'Laksa Nona',
      'Extra 1',
      'Extra 2',
    ])
    expect(result.unassignedItemNames).toEqual(['Extra 3', 'Extra 4', 'Extra 5'])
  })

  it('excludes drinks from food groups and non-main courses', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Ribeye', 'star', tag({ reel_moment: 'sizzle' }), {
        storytellingFit: 'strong',
        popularity: 0.9,
      }),
      item('Cola', 'star', drinkTag(), { storytellingFit: 'strong', popularity: 0.99 }, 'DRINK'),
      item('Soup', 'star', tag({ reel_moment: 'steam', course: ['appetizer'] }), {
        storytellingFit: 'strong',
        popularity: 0.8,
      }),
    ]

    const result = buildReelLineup(menuTaggerItems)

    expect(result.foodLeads).toHaveLength(1)
    expect(result.foodLeads[0]?.name).toBe('Ribeye')
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.leadName).toBe('Ribeye')
    expect(result.drinkLeads).toHaveLength(1)
    expect(result.drinkLeads[0]?.name).toBe('Cola')
    expect(result.drinkGroups).toHaveLength(1)
    expect(result.drinkGroups[0]?.leadName).toBe('Cola')
    expect(result.drinkGroups[0]?.id).toBe('drink-group-1')
    expect(result.unassignedItemNames).toEqual(['Soup'])
  })

  it('returns empty groups when no qualifying mains exist', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Ribeye', 'star', tag({ reel_moment: 'sizzle' }), { storytellingFit: 'weak' }),
    ]

    const result = buildReelLineup(menuTaggerItems)

    expect(result.foodLeads).toHaveLength(0)
    expect(result.groups).toHaveLength(0)
    expect(result.drinkLeads).toHaveLength(0)
    expect(result.drinkGroups).toHaveLength(0)
    expect(result.unassignedItemNames).toEqual(['Ribeye'])
  })

  it('includes weak storytelling drinks in drinkGroups up to three', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item(
        'Latte',
        'star',
        drinkTag({ reel_moment: 'pour' }),
        {
          storytellingFit: 'weak',
          popularity: 0.5,
        },
        'DRINKS',
      ),
      item(
        'Espresso',
        'star',
        drinkTag({ reel_moment: 'pour' }),
        {
          storytellingFit: 'strong',
          popularity: 0.9,
        },
        'DRINKS',
      ),
      item(
        'Cola',
        'puzzle',
        drinkTag({ reel_moment: 'bubble_fizz' }),
        {
          storytellingFit: 'weak',
          popularity: 0.3,
        },
        'DRINKS',
      ),
      item(
        'Juice',
        'star',
        drinkTag({ reel_moment: 'layer_build' }),
        {
          storytellingFit: 'weak',
        },
        'DRINKS',
      ),
      item(
        'Water',
        'star',
        drinkTag({ reel_moment: 'static_hero' }),
        {
          storytellingFit: 'weak',
        },
        'DRINKS',
      ),
    ]

    const result = buildReelLineup(menuTaggerItems)

    expect(result.drinkLeads).toHaveLength(REEL_LINEUP_MAX_DRINK_LEADS)
    expect(result.drinkLeads.map((lead) => lead.name)).toEqual(['Latte', 'Espresso', 'Cola'])
    expect(result.drinkGroups).toHaveLength(REEL_LINEUP_MAX_DRINK_LEADS)
    expect(result.drinkGroups.map((group) => group.leadName)).toEqual(['Latte', 'Espresso', 'Cola'])
    expect(result.unassignedItemNames).toEqual(['Juice', 'Water'])
    for (const group of result.drinkGroups) {
      expect(group.items).toHaveLength(1)
      expect(group.items[0]?.position).toBe(1)
    }
  })
})
