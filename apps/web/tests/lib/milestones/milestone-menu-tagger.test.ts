import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import { menuTaggerMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import {
  computeMenuTaggerUsedTags,
  menuTaggerTagsSchema,
} from '@/lib/milestones/menu-tagger-taxonomy'
import { getMilestonePresetCreateFields } from '@/lib/milestones/preset-definitions'

const sampleV2Tags = {
  kind: 'food' as const,
  ingredient: ['rice' as const],
  taste: ['spicy' as const, 'savory' as const],
  course: ['main' as const],
  reel_moment: 'sizzle' as const,
  texture: ['juicy' as const],
  prep_style: ['grilled' as const],
  occasion: ['dinner' as const],
  serve_temp: 'hot' as const,
  content_angle: ['signature' as const],
}

describe('menu tagger taxonomy', () => {
  it('accepts valid v2 tags and rejects unknown enum values', () => {
    const parsed = menuTaggerTagsSchema.safeParse(sampleV2Tags)
    expect(parsed.success).toBe(true)

    const invalid = menuTaggerTagsSchema.safeParse({
      ...sampleV2Tags,
      kind: 'snack',
    })
    expect(invalid.success).toBe(false)
  })

  it('computeMenuTaggerUsedTags rolls up unique sorted tags across all dimensions', () => {
    const used = computeMenuTaggerUsedTags([
      { tags: sampleV2Tags },
      {
        tags: {
          kind: 'drink',
          ingredient: ['tea'],
          taste: ['mild'],
          course: ['beverage'],
          reel_moment: 'pour',
          texture: ['silky'],
          prep_style: ['blended'],
          occasion: ['brunch'],
          serve_temp: 'cold',
          content_angle: [],
        },
      },
      {
        tags: {
          kind: 'food',
          ingredient: ['rice', 'vegetable'],
          taste: ['savory'],
          course: [],
          reel_moment: 'static_hero',
          texture: [],
          prep_style: [],
          occasion: [],
          serve_temp: 'room_temp',
          content_angle: ['hidden_gem'],
        },
      },
    ])

    expect(used).toEqual({
      kind: ['drink', 'food'],
      ingredient: ['rice', 'tea', 'vegetable'],
      taste: ['mild', 'savory', 'spicy'],
      course: ['beverage', 'main'],
      reel_moment: ['pour', 'sizzle', 'static_hero'],
      texture: ['juicy', 'silky'],
      prep_style: ['blended', 'grilled'],
      occasion: ['brunch', 'dinner'],
      serve_temp: ['cold', 'hot', 'room_temp'],
      content_angle: ['hidden_gem', 'signature'],
    })
  })

  it('menuTaggerMilestoneDataSchema validates full v2 payload', () => {
    const parsed = menuTaggerMilestoneDataSchema.safeParse({
      taxonomyVersion: 'v2',
      items: [
        {
          name: 'Nasi Goreng',
          role: 'star',
          category: 'Mains',
          tags: sampleV2Tags,
        },
      ],
      usedTags: {
        kind: ['food'],
        ingredient: ['rice'],
        taste: ['spicy', 'savory'],
        course: ['main'],
        reel_moment: ['sizzle'],
        texture: ['juicy'],
        prep_style: ['grilled'],
        occasion: ['dinner'],
        serve_temp: ['hot'],
        content_angle: ['signature'],
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects v1 taxonomyVersion payloads', () => {
    const parsed = menuTaggerMilestoneDataSchema.safeParse({
      taxonomyVersion: 'v1',
      items: [],
      usedTags: {
        kind: [],
        ingredient: [],
        taste: [],
        course: [],
        reel_moment: [],
        texture: [],
        prep_style: [],
        occasion: [],
        serve_temp: [],
        content_angle: [],
      },
    })
    expect(parsed.success).toBe(false)
  })

  it('getMilestonePresetCreateFields seeds menu_tagger with v2', () => {
    const fields = getMilestonePresetCreateFields('menu_tagger', (k) => k)
    expect(fields.presetId).toBe('menu_tagger')
    expect(fields.milestoneInput).toEqual({
      type: 'menu_tagger',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({
      taxonomyVersion: 'v2',
      items: [],
      usedTags: {
        kind: [],
        ingredient: [],
        taste: [],
        course: [],
        reel_moment: [],
        texture: [],
        prep_style: [],
        occasion: [],
        serve_temp: [],
        content_angle: [],
      },
    })
  })

  it('patchMilestoneSchema accepts menu_tagger input and data', () => {
    const parsed = patchMilestoneSchema.safeParse({
      presetId: 'menu_tagger',
      milestoneInput: { type: 'menu_tagger', value: { notes: 'bubble tea is drink' } },
      milestoneData: {
        taxonomyVersion: 'v2',
        items: [],
        usedTags: {
          kind: [],
          ingredient: [],
          taste: [],
          course: [],
          reel_moment: [],
          texture: [],
          prep_style: [],
          occasion: [],
          serve_temp: [],
          content_angle: [],
        },
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('menu tagger empty seed matches create fields (run body milestoneData)', () => {
    const fields = getMilestonePresetCreateFields('menu_tagger', (k) => k)
    const parsed = menuTaggerMilestoneDataSchema.safeParse(fields.milestoneData)
    expect(parsed.success).toBe(true)
  })
})
