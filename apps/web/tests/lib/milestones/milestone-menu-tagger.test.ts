import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import { menuTaggerMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import {
  computeMenuTaggerUsedTags,
  menuTaggerTagsSchema,
} from '@/lib/milestones/menu-tagger-taxonomy'
import { getMilestonePresetCreateFields } from '@/lib/milestones/preset-definitions'

describe('menu tagger taxonomy', () => {
  it('accepts valid tags and rejects unknown enum values', () => {
    const parsed = menuTaggerTagsSchema.safeParse({
      kind: 'food',
      ingredient: ['rice', 'noodle'],
      taste: ['savory'],
      course: ['main'],
    })
    expect(parsed.success).toBe(true)

    const invalid = menuTaggerTagsSchema.safeParse({
      kind: 'snack',
      ingredient: [],
      taste: [],
      course: [],
    })
    expect(invalid.success).toBe(false)
  })

  it('computeMenuTaggerUsedTags rolls up unique sorted tags', () => {
    const used = computeMenuTaggerUsedTags([
      {
        tags: {
          kind: 'food',
          ingredient: ['rice'],
          taste: ['spicy', 'savory'],
          course: ['main'],
        },
      },
      {
        tags: {
          kind: 'drink',
          ingredient: ['tea'],
          taste: ['mild'],
          course: ['beverage'],
        },
      },
      {
        tags: {
          kind: 'food',
          ingredient: ['rice', 'vegetable'],
          taste: ['savory'],
          course: [],
        },
      },
    ])

    expect(used).toEqual({
      kind: ['drink', 'food'],
      ingredient: ['rice', 'tea', 'vegetable'],
      taste: ['mild', 'savory', 'spicy'],
      course: ['beverage', 'main'],
    })
  })

  it('menuTaggerMilestoneDataSchema validates full payload', () => {
    const parsed = menuTaggerMilestoneDataSchema.safeParse({
      taxonomyVersion: 'v1',
      items: [
        {
          name: 'Nasi Goreng',
          role: 'star',
          category: 'Mains',
          tags: {
            kind: 'food',
            ingredient: ['rice'],
            taste: ['savory'],
            course: ['main'],
          },
        },
      ],
      usedTags: {
        kind: ['food'],
        ingredient: ['rice'],
        taste: ['savory'],
        course: ['main'],
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('getMilestonePresetCreateFields seeds menu_tagger', () => {
    const fields = getMilestonePresetCreateFields('menu_tagger', (k) => k)
    expect(fields.presetId).toBe('menu_tagger')
    expect(fields.milestoneInput).toEqual({
      type: 'menu_tagger',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toEqual({
      taxonomyVersion: 'v1',
      items: [],
      usedTags: {
        kind: [],
        ingredient: [],
        taste: [],
        course: [],
      },
    })
  })

  it('patchMilestoneSchema accepts menu_tagger input and data', () => {
    const parsed = patchMilestoneSchema.safeParse({
      presetId: 'menu_tagger',
      milestoneInput: { type: 'menu_tagger', value: { notes: 'bubble tea is drink' } },
      milestoneData: {
        taxonomyVersion: 'v1',
        items: [],
        usedTags: { kind: [], ingredient: [], taste: [], course: [] },
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
