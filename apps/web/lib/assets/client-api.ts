import type { BackgroundItem } from '@/lib/assets/backgrounds'
import { apiFetch } from '@/lib/api/client-fetch'

export type AssetCatalogItem = {
  name: string
  url: string
  size: number
  createdAt: string
}

export type AssetFlowOption = {
  slug: string
  displayName: string
}

export type AssetFlowContext = 'upload' | 'product-card' | 'design-create'

export async function loadProductAssets(init?: RequestInit): Promise<AssetCatalogItem[]> {
  const result = await apiFetch<{ items?: AssetCatalogItem[] }>(
    '/api/assets/list',
    { cache: 'no-store', ...init },
    'Failed to load assets',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.items ?? []
}

export async function loadBackgroundAssets(init?: RequestInit): Promise<BackgroundItem[]> {
  const result = await apiFetch<{ items?: BackgroundItem[] }>(
    '/api/assets/backgrounds/list',
    { cache: 'no-store', ...init },
    'Failed to load backgrounds',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.items ?? []
}

export async function loadDesignAssets(init?: RequestInit): Promise<AssetCatalogItem[]> {
  const result = await apiFetch<{ items?: AssetCatalogItem[] }>(
    '/api/assets/designs/list',
    { cache: 'no-store', ...init },
    'Failed to load designs',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.items ?? []
}

export async function loadAssetFlows(
  context: AssetFlowContext,
  init?: RequestInit,
): Promise<AssetFlowOption[]> {
  const result = await apiFetch<{ flows?: AssetFlowOption[] }>(
    `/api/assets/flows?context=${context}`,
    { cache: 'no-store', ...init },
    'Failed to load flows',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.flows ?? []
}

export type DesignCreateCatalog = {
  products: AssetCatalogItem[]
  backgrounds: BackgroundItem[]
  flows: AssetFlowOption[]
}

export async function loadDesignCreateCatalog(init?: RequestInit): Promise<DesignCreateCatalog> {
  const [products, backgrounds, flows] = await Promise.all([
    loadProductAssets(init),
    loadBackgroundAssets(init),
    loadAssetFlows('design-create', init),
  ])
  return { products, backgrounds, flows }
}
