import { apiFetch } from '@/lib/api/client-fetch'
import type { MediaCollection } from '@/lib/graphql/queries/media-collections'

export type MediaCatalogItem = {
  name: string
  url: string
  size: number
  createdAt: string
  displayName?: string | null
}

export type { MediaCollection }

export async function loadMedia(
  init?: RequestInit & { collectionId?: number },
): Promise<MediaCatalogItem[]> {
  const { collectionId, ...fetchInit } = init ?? {}
  const qs =
    collectionId !== undefined ? `?collectionId=${encodeURIComponent(String(collectionId))}` : ''
  const result = await apiFetch<{ items?: MediaCatalogItem[] }>(
    `/api/media/list${qs}`,
    { cache: 'no-store', ...fetchInit },
    'Failed to load media',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.items ?? []
}

export async function uploadMedia(file: File): Promise<MediaCatalogItem> {
  const fd = new FormData()
  fd.set('file', file)
  const result = await apiFetch<MediaCatalogItem>(
    '/api/media/upload',
    { method: 'POST', body: fd },
    'Failed to upload media',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export function mediaDownloadHref(name: string): string {
  return `/api/media/download?name=${encodeURIComponent(name)}`
}

export async function listMediaCollections(): Promise<MediaCollection[]> {
  const result = await apiFetch<{ collections?: MediaCollection[] }>(
    '/api/media/collections',
    { cache: 'no-store' },
    'Failed to load collections',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.collections ?? []
}

export async function createMediaCollection(name: string): Promise<MediaCollection> {
  const result = await apiFetch<{ collection: MediaCollection }>(
    '/api/media/collections',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    },
    'Failed to create collection',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.collection
}

export async function updateMediaCollection(id: number, name: string): Promise<MediaCollection> {
  const result = await apiFetch<{ collection: MediaCollection }>(
    `/api/media/collections/${encodeURIComponent(String(id))}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    },
    'Failed to rename collection',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.collection
}

export async function deleteMediaCollection(id: number): Promise<void> {
  const result = await apiFetch<{ ok: boolean }>(
    `/api/media/collections/${encodeURIComponent(String(id))}`,
    { method: 'DELETE' },
    'Failed to delete collection',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
}

export async function addMediaToCollection(
  collectionId: number,
  filename: string,
): Promise<MediaCollection> {
  const result = await apiFetch<{ collection: MediaCollection }>(
    `/api/media/collections/${encodeURIComponent(String(collectionId))}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, action: 'add' }),
    },
    'Failed to add media to collection',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.collection
}

export async function removeMediaFromCollection(
  collectionId: number,
  filename: string,
): Promise<MediaCollection> {
  const result = await apiFetch<{ collection: MediaCollection }>(
    `/api/media/collections/${encodeURIComponent(String(collectionId))}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, action: 'remove' }),
    },
    'Failed to remove media from collection',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.collection
}

export async function backfillMediaCatalog(): Promise<{
  scanned: number
  ensured: number
  failed: number
}> {
  const result = await apiFetch<{ scanned: number; ensured: number; failed: number }>(
    '/api/media/backfill',
    { method: 'POST' },
    'Failed to backfill media catalog',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}
