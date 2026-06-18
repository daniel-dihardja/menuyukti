import { apiFetch } from '@/lib/api/client-fetch'

export type IgStoryCatalogItem = {
  name: string
  url: string
  size: number
  createdAt: string
  mediaType: 'image' | 'video'
}

export async function loadIgStories(init?: RequestInit): Promise<IgStoryCatalogItem[]> {
  const result = await apiFetch<{ items?: IgStoryCatalogItem[] }>(
    '/api/igstories/list',
    { cache: 'no-store', ...init },
    'Failed to load IG stories',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.items ?? []
}

export function igStoryDownloadHref(name: string): string {
  return `/api/igstories/download?name=${encodeURIComponent(name)}`
}

export const MAX_IG_STORY_VIDEO_BYTES = 52_428_800
