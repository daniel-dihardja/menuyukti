import { formatMediaMentionLabel } from '@/lib/chat/chat-media-mention'
import type { MediaCatalogItem } from '@/lib/media/client-api'
import type { MediaCollection } from '@/lib/graphql/queries/media-collections'

/** Whether a media catalog row matches the typed `@` filter query. */
export function matchesMediaMentionFilter(
  filterQuery: string,
  item: Pick<MediaCatalogItem, 'name'> & { displayName?: string | null },
): boolean {
  if (filterQuery.length === 0) return true
  const q = filterQuery.toLowerCase()
  if (item.name.toLowerCase().includes(q)) return true
  if (item.displayName?.toLowerCase().includes(q)) return true
  return formatMediaMentionLabel(item.name).toLowerCase().includes(q)
}

/** Filter media catalog items for the chat `@` mention menu. */
export function filterMediaForCollectionBrowse(
  items: MediaCatalogItem[],
  filterQuery: string,
  excludeNames?: ReadonlySet<string>,
): MediaCatalogItem[] {
  return items.filter((item) => {
    if (excludeNames?.has(item.name)) return false
    return matchesMediaMentionFilter(filterQuery, item)
  })
}

/** Filter collections by name against the mention query. */
export function filterCollectionsForMention(
  collections: MediaCollection[],
  filterQuery: string,
): MediaCollection[] {
  if (filterQuery.length === 0) return collections
  const q = filterQuery.toLowerCase()
  return collections.filter((c) => c.name.toLowerCase().includes(q))
}

/** Reset browse state when the mention menu closes. */
export function browseCollectionIdAfterMenuClose(
  menuOpen: boolean,
  browseCollectionId: number | null,
): number | null {
  if (!menuOpen) return null
  return browseCollectionId
}
