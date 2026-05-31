import type { MenuTaggerItem } from '@/lib/graphql/node-schemas'

export const MENU_CLUSTERER_PROFILE_ID = 'hook_reel' as const
export const MENU_CLUSTERER_MAX_LEADS = 5
export const MENU_CLUSTERER_MAX_DRINK_LEADS = 3

type MenuTaggerItemLike = Pick<MenuTaggerItem, 'tags' | 'storytellingFit'>

/** Qualifying food hook lead: food kind, main course, strong storytelling (menu tagger order preserved). */
export function isMainCourseStrongStoryItem(item: MenuTaggerItemLike): boolean {
  return (
    item.tags.kind === 'food' &&
    item.tags.course.includes('main') &&
    item.storytellingFit === 'strong'
  )
}

/** Qualifying drink hook lead: drink kind, beverage course; storytelling fit ignored. */
export function isBeverageDrinkItem(item: Pick<MenuTaggerItem, 'tags'>): boolean {
  return item.tags.kind === 'drink' && item.tags.course.includes('beverage')
}
