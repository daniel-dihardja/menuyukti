import { describe, expect, it } from 'vitest'

import type { MenuTaggerItem } from '@/lib/graphql/node-schemas'
import { postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { buildPostLineup } from '@/lib/milestones/post-lineup'

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

function foodLead(name: string): MenuTaggerItem {
  return {
    name,
    role: 'star',
    category: 'MAINS',
    tags: tag({ reel_moment: 'sizzle' }),
    storytellingFit: 'strong',
    storytellingRationale: '',
  }
}

describe('buildPostLineup', () => {
  it('creates one carousel post with one slide per food lead', () => {
    const result = buildPostLineup([foodLead('Ribeye'), foodLead('Burger')], {
      sourceMenuClustererTitle: 'Menu clusterer',
    })

    expect(result.posts).toHaveLength(1)
    expect(result.posts[0]?.format).toBe('carousel')
    expect(result.posts[0]?.intent).toBe('pinned_monthly_menu')
    expect(result.posts[0]?.slides).toHaveLength(2)
    expect(result.posts[0]?.slides[0]?.dishName).toBe('Ribeye')
    expect(result.posts[0]?.slides[0]?.imageBrief).toContain('Ribeye')
    expect(result.sourceMenuClustererTitle).toBe('Menu clusterer')
    expect(postLineupMilestoneDataSchema.safeParse(result).success).toBe(true)
  })

  it('throws when food leads are empty', () => {
    expect(() => buildPostLineup([])).toThrow(/food lead/i)
  })
})
