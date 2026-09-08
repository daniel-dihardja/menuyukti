export const INVENTORY_CATEGORIES = [
  'dry_goods',
  'dairy',
  'produce',
  'proteins',
  'frozen',
  'beverages',
  'spices_condiments',
  'cleaning',
  'packaging',
  'other',
] as const

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number]

export const DEFAULT_INVENTORY_CATEGORY: InventoryCategory = 'other'

export function isInventoryCategory(value: string): value is InventoryCategory {
  return (INVENTORY_CATEGORIES as readonly string[]).includes(value)
}
