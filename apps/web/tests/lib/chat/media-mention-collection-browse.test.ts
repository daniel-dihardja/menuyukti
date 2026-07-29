import { describe, expect, it } from 'vitest'

import {
  browseCollectionIdAfterMenuClose,
  filterCollectionsForMention,
  filterMediaForCollectionBrowse,
  matchesMediaMentionFilter,
} from '@/lib/chat/media-mention-collection-browse'
import type { MediaCatalogItem, MediaCollection } from '@/lib/media/client-api'

const sampleMedia = (
  overrides: Partial<MediaCatalogItem> & { name: string },
): MediaCatalogItem => ({
  url: 'https://example.com/x',
  size: 1,
  createdAt: '2026-01-01T00:00:00Z',
  displayName: null,
  ...overrides,
})

const sampleCollection = (
  overrides: Partial<MediaCollection> & { id: number; name: string },
): MediaCollection => ({
  workspaceId: 1,
  createdByClerkUserId: 'user_1',
  memberCount: 0,
  ...overrides,
})

describe('media-mention-collection-browse', () => {
  it('matches media by name, displayName, and shortened label', () => {
    expect(matchesMediaMentionFilter('', { name: 'abc.webp' })).toBe(true)
    expect(
      matchesMediaMentionFilter('latte', {
        name: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp',
        displayName: 'Iced Latte',
      }),
    ).toBe(true)
    expect(
      matchesMediaMentionFilter('aaaa', {
        name: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp',
      }),
    ).toBe(true)
    expect(matchesMediaMentionFilter('zzz', { name: 'photo.webp' })).toBe(false)
  })

  it('filters media and respects exclude names', () => {
    const items = [
      sampleMedia({ name: 'photo-one.webp', displayName: 'Hero' }),
      sampleMedia({ name: 'photo-two.webp' }),
      sampleMedia({ name: 'skip-me.webp' }),
    ]
    expect(filterMediaForCollectionBrowse(items, 'hero').map((i) => i.name)).toEqual([
      'photo-one.webp',
    ])
    expect(
      filterMediaForCollectionBrowse(items, '', new Set(['skip-me.webp'])).map((i) => i.name),
    ).toEqual(['photo-one.webp', 'photo-two.webp'])
  })

  it('filters collections by name', () => {
    const collections = [
      sampleCollection({ id: 1, name: 'Summer Promo' }),
      sampleCollection({ id: 2, name: 'Menu shots' }),
    ]
    expect(filterCollectionsForMention(collections, 'sum').map((c) => c.id)).toEqual([1])
    expect(filterCollectionsForMention(collections, '').map((c) => c.id)).toEqual([1, 2])
    expect(filterCollectionsForMention(collections, 'zzz')).toEqual([])
  })

  it('clears browse collection id when the menu closes', () => {
    expect(browseCollectionIdAfterMenuClose(false, 42)).toBeNull()
    expect(browseCollectionIdAfterMenuClose(true, 42)).toBe(42)
    expect(browseCollectionIdAfterMenuClose(true, null)).toBeNull()
  })
})
