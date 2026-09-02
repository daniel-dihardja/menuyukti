import {
  DEFAULT_INVENTORY_STORAGE_ZONE,
  type InventoryStorageZone,
} from '@/lib/inventar/storage-zones'
import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'

export type CatalogForm = {
  name: string
  packageSize: string
  packageUnit: string
  storageZone: InventoryStorageZone
  price: string
}

export const emptyCatalogForm: CatalogForm = {
  name: '',
  packageSize: '',
  packageUnit: 'kg',
  storageZone: DEFAULT_INVENTORY_STORAGE_ZONE,
  price: '',
}

export function catalogFormFromItem(item: InventoryCatalogItem): CatalogForm {
  return {
    name: item.name,
    packageSize: String(item.packageSize),
    packageUnit: item.packageUnit,
    storageZone: item.storageZone,
    price: item.price != null ? String(item.price) : '',
  }
}

export function parseOptionalPrice(
  raw: string,
): { ok: true; price: number | null } | { ok: false } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, price: null }
  const price = Number(trimmed)
  if (!Number.isFinite(price) || price < 0) return { ok: false }
  return { ok: true, price }
}

export function catalogFormValidationError(
  form: CatalogForm,
  t: (key: string) => string,
): string | null {
  const packageSize = Number(form.packageSize)
  if (!form.name.trim()) return t('validation.nameRequired')
  if (!Number.isFinite(packageSize) || packageSize <= 0) return t('validation.packageSizePositive')
  if (!form.packageUnit.trim()) return t('validation.unitRequired')
  const parsedPrice = parseOptionalPrice(form.price)
  if (!parsedPrice.ok) return t('validation.priceMin')
  return null
}
