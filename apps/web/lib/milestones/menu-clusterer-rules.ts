import type { MenuTaggerItem } from '@/lib/graphql/node-schemas'

export const MENU_CLUSTERER_PROFILE_ID = 'hook_reel' as const
export const MENU_CLUSTERER_MAX_LEADS = 5

type MenuTaggerItemLike = Pick<MenuTaggerItem, 'tags' | 'storytellingFit'>

/** Qualifying food hook lead: food kind, main course, strong storytelling (menu tagger order preserved). */
export function isMainCourseStrongStoryItem(item: MenuTaggerItemLike): boolean {
  return (
    item.tags.kind === 'food' &&
    item.tags.course.includes('main') &&
    item.storytellingFit === 'strong'
  )
}
