import { apiFetch } from '@/lib/api/client-fetch'

export type MediaCatalogItem = {
  name: string
  url: string
  size: number
  createdAt: string
}

export async function loadMedia(init?: RequestInit): Promise<MediaCatalogItem[]> {
  const result = await apiFetch<{ items?: MediaCatalogItem[] }>(
    '/api/media/list',
    { cache: 'no-store', ...init },
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
