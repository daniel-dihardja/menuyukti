import { apiFetch } from '@/lib/api/client-fetch'
import type { VisionGatewayModelId } from '@/lib/chat/gateway-chat-models'
import type { Style } from '@/lib/graphql/queries/styles'
import type { StyleSpec } from '@/lib/styles/style-spec'

export type { Style }

export async function listStyles(): Promise<Style[]> {
  const result = await apiFetch<{ styles?: Style[] }>(
    '/api/styles',
    { cache: 'no-store' },
    'Failed to load styles',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.styles ?? []
}

export async function getStyle(id: number): Promise<Style> {
  const result = await apiFetch<{ style: Style }>(
    `/api/styles/${encodeURIComponent(String(id))}`,
    { cache: 'no-store' },
    'Failed to load style',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.style
}

export async function createStyle(input: {
  name: string
  rules: string
  referenceImageName: string
  isDefault?: boolean
  styleSpec?: StyleSpec
}): Promise<Style> {
  const result = await apiFetch<{ style: Style }>(
    '/api/styles',
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

export async function updateStyle(
  id: number,
  input: {
    name?: string
    rules?: string
    referenceImageName?: string
    isDefault?: boolean
    styleSpec?: StyleSpec
  },
): Promise<Style> {
  const result = await apiFetch<{ style: Style }>(
    `/api/styles/${encodeURIComponent(String(id))}`,
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

export async function deleteStyle(id: number): Promise<void> {
  const result = await apiFetch<{ ok: boolean }>(
    `/api/styles/${encodeURIComponent(String(id))}`,
    { method: 'DELETE' },
    'Failed to delete style',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
}

export async function draftStyleFromImage(input: {
  mediaName: string
  intent?: string
  model: VisionGatewayModelId
}): Promise<{ name: string; styleSpec: StyleSpec; mediaName: string }> {
  const result = await apiFetch<{ name: string; styleSpec: StyleSpec; mediaName: string }>(
    '/api/styles/draft-from-image',
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
