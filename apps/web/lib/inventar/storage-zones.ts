export const INVENTORY_STORAGE_ZONES = ['cooler', 'freezer', 'dry'] as const

export type InventoryStorageZone = (typeof INVENTORY_STORAGE_ZONES)[number]

export const DEFAULT_INVENTORY_STORAGE_ZONE: InventoryStorageZone = 'dry'

/** Walk-count order: cooler → freezer → dry */
export const INVENTORY_STORAGE_ZONE_SORT_ORDER: Record<InventoryStorageZone, number> = {
  cooler: 0,
  freezer: 1,
  dry: 2,
}

export function isInventoryStorageZone(value: string): value is InventoryStorageZone {
  return (INVENTORY_STORAGE_ZONES as readonly string[]).includes(value)
}
