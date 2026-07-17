import { apiFetch } from '@/lib/api/client-fetch'
import type { LocationStyle } from '@/lib/graphql/queries/location-styles'

export type { LocationStyle }

export async function listLocationStyles(locationId: number): Promise<LocationStyle[]> {
  const result = await apiFetch<{ styles?: LocationStyle[] }>(
    `/api/location-styles?locationId=${encodeURIComponent(String(locationId))}`,
    { cache: 'no-store' },
    'Failed to load styles',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.styles ?? []
}

export async function createLocationStyle(input: {
  locationId: number
  name: string
  rules: string
  referenceImageName: string
  isDefault?: boolean
}): Promise<LocationStyle> {
  const result = await apiFetch<{ style: LocationStyle }>(
    '/api/location-styles',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to create style',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.style
}

export async function updateLocationStyle(
  id: number,
  input: {
    name?: string
    rules?: string
    referenceImageName?: string
    isDefault?: boolean
  },
): Promise<LocationStyle> {
  const result = await apiFetch<{ style: LocationStyle }>(
    `/api/location-styles/${encodeURIComponent(String(id))}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to update style',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.style
}

export async function deleteLocationStyle(id: number): Promise<void> {
  const result = await apiFetch<{ ok: boolean }>(
    `/api/location-styles/${encodeURIComponent(String(id))}`,
    { method: 'DELETE' },
    'Failed to delete style',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
}
