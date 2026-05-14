import { describe, expect, it } from 'vitest'

import type { MenuTaggerItem } from '@/lib/graphql/node-schemas'
import { reelLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { REEL_LINEUP_MAX_LEADS } from '@/lib/milestones/reel-lineup-rules'
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

  it('excludes drinks and non-main courses', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Ribeye', 'star', tag({ reel_moment: 'sizzle' }), {
        storytellingFit: 'strong',
        popularity: 0.9,
      }),
      item(
        'Cola',
        'star',
        {
          kind: 'drink',
          ingredient: ['sugar'],
          taste: ['sweet'],
          course: ['beverage'],
          reel_moment: 'pour',
          texture: ['silky'],
          prep_style: ['blended'],
          occasion: ['dinner'],
          serve_temp: 'cold',
          content_angle: [],
        },
        { storytellingFit: 'strong', popularity: 0.99 },
        'DRINK',
      ),
      item('Soup', 'star', tag({ reel_moment: 'steam', course: ['appetizer'] }), {
        storytellingFit: 'strong',
        popularity: 0.8,
      }),
    ]

    const result = buildReelLineup(menuTaggerItems)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.leadName).toBe('Ribeye')
    expect(result.unassignedItemNames).toEqual(expect.arrayContaining(['Cola', 'Soup']))
  })

  it('returns empty groups when no qualifying mains exist', () => {
    const menuTaggerItems: MenuTaggerItem[] = [
      item('Ribeye', 'star', tag({ reel_moment: 'sizzle' }), { storytellingFit: 'weak' }),
    ]

    const result = buildReelLineup(menuTaggerItems)

    expect(result.groups).toHaveLength(0)
    expect(result.unassignedItemNames).toEqual(['Ribeye'])
  })
})
