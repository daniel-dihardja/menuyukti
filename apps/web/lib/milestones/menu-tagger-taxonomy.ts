import { z } from 'zod'

export const MENU_TAGGER_TAXONOMY_VERSION = 'v2' as const

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
  'pasta',
  'tofu_plant',
  'chocolate',
  'nuts',
  'herbs_aromatics',
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
  'smoky',
  'tangy',
  'fresh',
] as const
export const MENU_TAGGER_COURSE_VALUES = [
  'appetizer',
  'main',
  'dessert',
  'side',
  'beverage',
  'snack',
  'combo',
  'breakfast',
  'brunch',
] as const
export const MENU_TAGGER_REEL_MOMENT_VALUES = [
  'steam',
  'sizzle',
  'pour',
  'stretch_pull',
  'crunch_break',
  'flame',
  'toss_stir',
  'layer_build',
  'slice_reveal',
  'drip_melt',
  'bubble_fizz',
  'steam_open',
  'garnish_finish',
  'static_hero',
] as const
export const MENU_TAGGER_TEXTURE_VALUES = [
  'crispy',
  'creamy',
  'chewy',
  'juicy',
  'flaky',
  'crunchy',
  'silky',
  'chunky',
] as const
export const MENU_TAGGER_PREP_STYLE_VALUES = [
  'grilled',
  'fried',
  'baked',
  'raw',
  'smoked',
  'steamed',
  'braised',
  'fermented',
  'assembled',
  'blended',
] as const
export const MENU_TAGGER_OCCASION_VALUES = [
  'brunch',
  'lunch',
  'dinner',
  'late_night',
  'date_night',
  'sharing',
  'solo',
  'takeaway',
  'celebration',
  'comfort',
] as const
export const MENU_TAGGER_SERVE_TEMP_VALUES = ['hot', 'cold', 'room_temp', 'frozen'] as const
export const MENU_TAGGER_CONTENT_ANGLE_VALUES = [
  'signature',
  'bestseller',
  'chef_pick',
  'hidden_gem',
  'new',
  'seasonal',
  'value_hero',
  'premium_hero',
] as const

export const MENU_TAGGER_DIMENSIONS = [
  'kind',
  'ingredient',
  'taste',
  'course',
  'reel_moment',
  'texture',
  'prep_style',
  'occasion',
  'serve_temp',
  'content_angle',
] as const
export type MenuTaggerDimension = (typeof MENU_TAGGER_DIMENSIONS)[number]

export const MENU_TAGGER_SINGLE_VALUE_DIMENSIONS = ['kind', 'reel_moment', 'serve_temp'] as const
export type MenuTaggerSingleValueDimension = (typeof MENU_TAGGER_SINGLE_VALUE_DIMENSIONS)[number]

export const MAX_INGREDIENT_TAGS = 3
export const MAX_TASTE_TAGS = 3
export const MAX_COURSE_TAGS = 2
export const MAX_TEXTURE_TAGS = 2
export const MAX_PREP_STYLE_TAGS = 2
export const MAX_OCCASION_TAGS = 2
export const MAX_CONTENT_ANGLE_TAGS = 1

export const menuTaggerKindSchema = z.enum(MENU_TAGGER_KIND_VALUES)
export const menuTaggerIngredientSchema = z.enum(MENU_TAGGER_INGREDIENT_VALUES)
export const menuTaggerTasteSchema = z.enum(MENU_TAGGER_TASTE_VALUES)
export const menuTaggerCourseSchema = z.enum(MENU_TAGGER_COURSE_VALUES)
export const menuTaggerReelMomentSchema = z.enum(MENU_TAGGER_REEL_MOMENT_VALUES)
export const menuTaggerTextureSchema = z.enum(MENU_TAGGER_TEXTURE_VALUES)
export const menuTaggerPrepStyleSchema = z.enum(MENU_TAGGER_PREP_STYLE_VALUES)
export const menuTaggerOccasionSchema = z.enum(MENU_TAGGER_OCCASION_VALUES)
export const menuTaggerServeTempSchema = z.enum(MENU_TAGGER_SERVE_TEMP_VALUES)
export const menuTaggerContentAngleSchema = z.enum(MENU_TAGGER_CONTENT_ANGLE_VALUES)

export const menuTaggerTagsSchema = z.object({
  kind: menuTaggerKindSchema,
  ingredient: z.array(menuTaggerIngredientSchema).max(MAX_INGREDIENT_TAGS),
  taste: z.array(menuTaggerTasteSchema).max(MAX_TASTE_TAGS),
  course: z.array(menuTaggerCourseSchema).max(MAX_COURSE_TAGS),
  reel_moment: menuTaggerReelMomentSchema,
  texture: z.array(menuTaggerTextureSchema).max(MAX_TEXTURE_TAGS),
  prep_style: z.array(menuTaggerPrepStyleSchema).max(MAX_PREP_STYLE_TAGS),
  occasion: z.array(menuTaggerOccasionSchema).max(MAX_OCCASION_TAGS),
  serve_temp: menuTaggerServeTempSchema,
  content_angle: z.array(menuTaggerContentAngleSchema).max(MAX_CONTENT_ANGLE_TAGS),
})

export type MenuTaggerTags = z.infer<typeof menuTaggerTagsSchema>

export const menuTaggerUsedTagsSchema = z.object({
  kind: z.array(menuTaggerKindSchema),
  ingredient: z.array(menuTaggerIngredientSchema),
  taste: z.array(menuTaggerTasteSchema),
  course: z.array(menuTaggerCourseSchema),
  reel_moment: z.array(menuTaggerReelMomentSchema),
  texture: z.array(menuTaggerTextureSchema),
  prep_style: z.array(menuTaggerPrepStyleSchema),
  occasion: z.array(menuTaggerOccasionSchema),
  serve_temp: z.array(menuTaggerServeTempSchema),
  content_angle: z.array(menuTaggerContentAngleSchema),
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
    reel_moment: [],
    texture: [],
    prep_style: [],
    occasion: [],
    serve_temp: [],
    content_angle: [],
  }
}

export function computeMenuTaggerUsedTags(items: MenuTaggerItemForRollup[]): MenuTaggerUsedTags {
  const kind = new Set<string>()
  const ingredient = new Set<string>()
  const taste = new Set<string>()
  const course = new Set<string>()
  const reelMoment = new Set<string>()
  const texture = new Set<string>()
  const prepStyle = new Set<string>()
  const occasion = new Set<string>()
  const serveTemp = new Set<string>()
  const contentAngle = new Set<string>()

  for (const item of items) {
    kind.add(item.tags.kind)
    reelMoment.add(item.tags.reel_moment)
    serveTemp.add(item.tags.serve_temp)
    for (const value of item.tags.ingredient) {
      ingredient.add(value)
    }
    for (const value of item.tags.taste) {
      taste.add(value)
    }
    for (const value of item.tags.course) {
      course.add(value)
    }
    for (const value of item.tags.texture) {
      texture.add(value)
    }
    for (const value of item.tags.prep_style) {
      prepStyle.add(value)
    }
    for (const value of item.tags.occasion) {
      occasion.add(value)
    }
    for (const value of item.tags.content_angle) {
      contentAngle.add(value)
    }
  }

  return {
    kind: [...kind].sort() as MenuTaggerUsedTags['kind'],
    ingredient: [...ingredient].sort() as MenuTaggerUsedTags['ingredient'],
    taste: [...taste].sort() as MenuTaggerUsedTags['taste'],
    course: [...course].sort() as MenuTaggerUsedTags['course'],
    reel_moment: [...reelMoment].sort() as MenuTaggerUsedTags['reel_moment'],
    texture: [...texture].sort() as MenuTaggerUsedTags['texture'],
    prep_style: [...prepStyle].sort() as MenuTaggerUsedTags['prep_style'],
    occasion: [...occasion].sort() as MenuTaggerUsedTags['occasion'],
    serve_temp: [...serveTemp].sort() as MenuTaggerUsedTags['serve_temp'],
    content_angle: [...contentAngle].sort() as MenuTaggerUsedTags['content_angle'],
  }
}
