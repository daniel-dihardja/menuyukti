import { apiFetch } from '@/lib/api/client-fetch'

export type PhotoCatalogItem = {
  name: string
  url: string
  size: number
  createdAt: string
}

export async function loadPhotos(init?: RequestInit): Promise<PhotoCatalogItem[]> {
  const result = await apiFetch<{ items?: PhotoCatalogItem[] }>(
    '/api/photos/list',
    { cache: 'no-store', ...init },
    'Failed to load photos',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.items ?? []
}

export function photoDownloadHref(name: string): string {
  return `/api/photos/download?name=${encodeURIComponent(name)}`
}
