import { z } from 'zod'

export const MENU_TAGGER_TAXONOMY_VERSION = 'v1' as const

export const MENU_TAGGER_KIND_VALUES = ['food', 'drink', 'other'] as const
export const MENU_TAGGER_INGREDIENT_VALUES = [
  'rice',
  'noodle',
  'bread',
  'meat',
  'seafood',
  'poultry',
  'vegetable',
  'dairy',
  'fruit',
  'egg',
  'coffee',
  'tea',
  'alcohol',
  'other',
] as const
export const MENU_TAGGER_TASTE_VALUES = [
  'spicy',
  'sour',
  'sweet',
  'savory',
  'umami',
  'bitter',
  'mild',
] as const
export const MENU_TAGGER_COURSE_VALUES = [
  'appetizer',
  'main',
  'dessert',
  'side',
  'beverage',
  'snack',
  'combo',
] as const

export const MENU_TAGGER_DIMENSIONS = ['kind', 'ingredient', 'taste', 'course'] as const
export type MenuTaggerDimension = (typeof MENU_TAGGER_DIMENSIONS)[number]

export const menuTaggerKindSchema = z.enum(MENU_TAGGER_KIND_VALUES)
export const menuTaggerIngredientSchema = z.enum(MENU_TAGGER_INGREDIENT_VALUES)
export const menuTaggerTasteSchema = z.enum(MENU_TAGGER_TASTE_VALUES)
export const menuTaggerCourseSchema = z.enum(MENU_TAGGER_COURSE_VALUES)

export const menuTaggerTagsSchema = z.object({
  kind: menuTaggerKindSchema,
  ingredient: z.array(menuTaggerIngredientSchema).max(3),
  taste: z.array(menuTaggerTasteSchema).max(3),
  course: z.array(menuTaggerCourseSchema).max(2),
})

export type MenuTaggerTags = z.infer<typeof menuTaggerTagsSchema>

export const menuTaggerUsedTagsSchema = z.object({
  kind: z.array(menuTaggerKindSchema),
  ingredient: z.array(menuTaggerIngredientSchema),
  taste: z.array(menuTaggerTasteSchema),
  course: z.array(menuTaggerCourseSchema),
})

export type MenuTaggerUsedTags = z.infer<typeof menuTaggerUsedTagsSchema>

export type MenuTaggerItemForRollup = {
  tags: MenuTaggerTags
}

export function emptyMenuTaggerUsedTags(): MenuTaggerUsedTags {
  return {
    kind: [],
    ingredient: [],
    taste: [],
    course: [],
  }
}

export function computeMenuTaggerUsedTags(items: MenuTaggerItemForRollup[]): MenuTaggerUsedTags {
  const kind = new Set<string>()
  const ingredient = new Set<string>()
  const taste = new Set<string>()
  const course = new Set<string>()

  for (const item of items) {
    kind.add(item.tags.kind)
    for (const value of item.tags.ingredient) {
      ingredient.add(value)
    }
    for (const value of item.tags.taste) {
      taste.add(value)
    }
    for (const value of item.tags.course) {
      course.add(value)
    }
  }

  return {
    kind: [...kind].sort() as MenuTaggerUsedTags['kind'],
    ingredient: [...ingredient].sort() as MenuTaggerUsedTags['ingredient'],
    taste: [...taste].sort() as MenuTaggerUsedTags['taste'],
    course: [...course].sort() as MenuTaggerUsedTags['course'],
  }
}
