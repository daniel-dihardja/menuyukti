import type { MenuTaggerItem } from '@/lib/graphql/node-schemas'

export const REEL_LINEUP_PROFILE_ID = 'hook_reel' as const

export const REEL_LINEUP_GROUP_MIN_SIZE = 3
export const REEL_LINEUP_GROUP_MAX_SIZE = 5
export const REEL_LINEUP_DRINK_SLOT_SIZE = 1

type MenuTaggerItemLike = Pick<MenuTaggerItem, 'category' | 'tags'>

function isDrinkCategory(category: string): boolean {
  const normalized = category.trim().toUpperCase()
  return normalized === 'DRINK' || normalized === 'DRINKS' || normalized.startsWith('DRINK')
}

export function isDrinkMenuTaggerItem(item: MenuTaggerItemLike): boolean {
  if (item.tags.kind === 'drink') return true
  return isDrinkCategory(item.category)
}

export function isFoodMenuTaggerItem(item: MenuTaggerItemLike): boolean {
  return !isDrinkMenuTaggerItem(item)
}

/** Primary on-camera hooks — strong Reel openers. */
export const REEL_HOOK_MOMENTS_HIGH = new Set([
  'pour',
  'sizzle',
  'stretch_pull',
  'flame',
  'toss_stir',
  'crunch_break',
  'drip_melt',
  'bubble_fizz',
])

/** Secondary motion hooks. */
export const REEL_HOOK_MOMENTS_MEDIUM = new Set([
  'steam',
  'steam_open',
  'layer_build',
  'slice_reveal',
  'garnish_finish',
])

export const REEL_HOOK_MOMENT_STATIC = 'static_hero'

export const CONTENT_ANGLE_LEAD_BOOST = new Set([
  'signature',
  'bestseller',
  'chef_pick',
  'premium_hero',
])

export function reelHookStrength(reelMoment: string): number {
  if (REEL_HOOK_MOMENTS_HIGH.has(reelMoment)) return 1
  if (REEL_HOOK_MOMENTS_MEDIUM.has(reelMoment)) return 0.65
  if (reelMoment === REEL_HOOK_MOMENT_STATIC) return 0.3
  return 0.5
}

export function contentAngleLeadBoost(contentAngles: readonly string[]): number {
  return contentAngles.some((angle) => CONTENT_ANGLE_LEAD_BOOST.has(angle)) ? 1 : 0
}
