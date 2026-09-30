/** Controlled dietary and allergen catalogs for curated menu items. */

export const MENU_DIETARY_TAGS = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'gluten_free',
  'dairy_free',
  'halal',
  'spicy',
] as const

export type MenuDietaryTag = (typeof MENU_DIETARY_TAGS)[number]

export const MENU_ALLERGENS = [
  'gluten',
  'dairy',
  'eggs',
  'fish',
  'shellfish',
  'peanuts',
  'tree_nuts',
  'soy',
  'sesame',
] as const

export type MenuAllergen = (typeof MENU_ALLERGENS)[number]

const DIETARY_SET = new Set<string>(MENU_DIETARY_TAGS)
const ALLERGEN_SET = new Set<string>(MENU_ALLERGENS)

export function isMenuDietaryTag(value: string): value is MenuDietaryTag {
  return DIETARY_SET.has(value)
}

export function isMenuAllergen(value: string): value is MenuAllergen {
  return ALLERGEN_SET.has(value)
}

/** Dedupe and keep only known dietary tags, sorted. */
export function normalizeDietaryTags(raw: unknown): MenuDietaryTag[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<MenuDietaryTag>()
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const key = entry.trim()
    if (isMenuDietaryTag(key)) seen.add(key)
  }
  return MENU_DIETARY_TAGS.filter((tag) => seen.has(tag))
}

/** Dedupe and keep only known allergens, sorted. */
export function normalizeAllergens(raw: unknown): MenuAllergen[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<MenuAllergen>()
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const key = entry.trim()
    if (isMenuAllergen(key)) seen.add(key)
  }
  return MENU_ALLERGENS.filter((tag) => seen.has(tag))
}

export type MenuAttributeFilterableItem = {
  dietaryTags: readonly string[]
  allergens: readonly string[]
}

/**
 * Include AND on dietary tags; exclude if item lists any selected allergen.
 * Empty selections mean no constraint on that axis.
 */
export function itemMatchesMenuAttributeFilters(
  item: MenuAttributeFilterableItem,
  dietaryInclude: ReadonlySet<string>,
  allergenExclude: ReadonlySet<string>,
): boolean {
  if (dietaryInclude.size > 0) {
    const tags = new Set(item.dietaryTags)
    for (const required of dietaryInclude) {
      if (!tags.has(required)) return false
    }
  }
  if (allergenExclude.size > 0) {
    for (const allergen of item.allergens) {
      if (allergenExclude.has(allergen)) return false
    }
  }
  return true
}

export function collectPresentMenuAttributes<T extends MenuAttributeFilterableItem>(
  items: readonly T[],
): { dietaryTags: MenuDietaryTag[]; allergens: MenuAllergen[] } {
  const dietary = new Set<MenuDietaryTag>()
  const allergens = new Set<MenuAllergen>()
  for (const item of items) {
    for (const tag of item.dietaryTags) {
      if (isMenuDietaryTag(tag)) dietary.add(tag)
    }
    for (const allergen of item.allergens) {
      if (isMenuAllergen(allergen)) allergens.add(allergen)
    }
  }
  return {
    dietaryTags: MENU_DIETARY_TAGS.filter((tag) => dietary.has(tag)),
    allergens: MENU_ALLERGENS.filter((tag) => allergens.has(tag)),
  }
}
