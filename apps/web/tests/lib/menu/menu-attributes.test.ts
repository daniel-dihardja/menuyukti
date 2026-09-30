import { describe, expect, it } from 'vitest'

import {
  collectPresentMenuAttributes,
  itemMatchesMenuAttributeFilters,
  normalizeAllergens,
  normalizeDietaryTags,
} from '@/lib/menu/menu-attributes'

describe('normalizeDietaryTags / normalizeAllergens', () => {
  it('dedupes and sorts known keys', () => {
    expect(normalizeDietaryTags(['spicy', 'vegan', 'spicy', 'unknown'])).toEqual([
      'vegan',
      'spicy',
    ])
    expect(normalizeAllergens(['soy', 'gluten', 'soy'])).toEqual(['gluten', 'soy'])
  })

  it('returns empty for non-arrays', () => {
    expect(normalizeDietaryTags(null)).toEqual([])
    expect(normalizeAllergens('gluten')).toEqual([])
  })
})

describe('itemMatchesMenuAttributeFilters', () => {
  const item = {
    dietaryTags: ['vegan', 'spicy'],
    allergens: ['soy', 'sesame'],
  }

  it('matches when no filters are selected', () => {
    expect(itemMatchesMenuAttributeFilters(item, new Set(), new Set())).toBe(true)
  })

  it('requires all selected dietary tags (AND)', () => {
    expect(itemMatchesMenuAttributeFilters(item, new Set(['vegan']), new Set())).toBe(true)
    expect(itemMatchesMenuAttributeFilters(item, new Set(['vegan', 'spicy']), new Set())).toBe(
      true,
    )
    expect(
      itemMatchesMenuAttributeFilters(item, new Set(['vegan', 'halal']), new Set()),
    ).toBe(false)
  })

  it('excludes items that contain any selected allergen', () => {
    expect(itemMatchesMenuAttributeFilters(item, new Set(), new Set(['peanuts']))).toBe(true)
    expect(itemMatchesMenuAttributeFilters(item, new Set(), new Set(['soy']))).toBe(false)
    expect(itemMatchesMenuAttributeFilters(item, new Set(['vegan']), new Set(['sesame']))).toBe(
      false,
    )
  })
})

describe('collectPresentMenuAttributes', () => {
  it('returns only tags present on items, in catalog order', () => {
    const present = collectPresentMenuAttributes([
      { dietaryTags: ['spicy', 'halal'], allergens: ['eggs'] },
      { dietaryTags: ['vegan'], allergens: ['soy', 'eggs'] },
    ])
    expect(present.dietaryTags).toEqual(['vegan', 'halal', 'spicy'])
    expect(present.allergens).toEqual(['eggs', 'soy'])
  })
})
