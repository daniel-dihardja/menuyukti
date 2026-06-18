import { apiFetch } from '@/lib/api/client-fetch'

export type ReelCatalogItem = {
  name: string
  url: string
  size: number
  createdAt: string
  mediaType: 'image' | 'video'
}

export async function loadReels(init?: RequestInit): Promise<ReelCatalogItem[]> {
  const result = await apiFetch<{ items?: ReelCatalogItem[] }>(
    '/api/reels/list',
    { cache: 'no-store', ...init },
    'Failed to load reels',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.items ?? []
}

export function reelDownloadHref(name: string): string {
  return `/api/reels/download?name=${encodeURIComponent(name)}`
}

export const MAX_REEL_VIDEO_BYTES = 52_428_800
