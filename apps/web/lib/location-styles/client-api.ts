import { apiFetch } from '@/lib/api/client-fetch'
import type { LocationStyle } from '@/lib/graphql/queries/location-styles'
import type { StyleSpec } from '@/lib/location-styles/style-spec'

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
  styleSpec?: StyleSpec
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
    styleSpec?: StyleSpec
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

export async function draftLocationStyleFromImage(input: {
  mediaName: string
  intent?: string
}): Promise<{ name: string; styleSpec: StyleSpec; mediaName: string }> {
  const result = await apiFetch<{ name: string; styleSpec: StyleSpec; mediaName: string }>(
    '/api/location-styles/draft-from-image',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to draft style from image',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}
