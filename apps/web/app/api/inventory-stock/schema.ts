import { z } from 'zod'

import { INVENTORY_STORAGE_ZONES } from '@/lib/inventar/storage-zones'

const storageZoneSchema = z.enum(INVENTORY_STORAGE_ZONES)

export const createInventoryCatalogItemWithStockBodySchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().trim().min(1).max(256),
  packageSize: z.number().positive(),
  packageUnit: z.string().trim().min(1).max(32),
  onHand: z.number().min(0),
  storageZone: storageZoneSchema.optional().default('dry'),
})

export const upsertInventoryStockBodySchema = z.object({
  locationId: z.number().int().positive(),
  catalogItemId: z.number().int().positive(),
  onHand: z.number().min(0),
})

export const transferInventoryStockBodySchema = z.object({
  fromStockId: z.number().int().positive(),
  toLocationId: z.number().int().positive(),
  quantity: z.number().positive(),
})

export const patchInventoryStockBodySchema = z.object({
  onHand: z.number().min(0),
})

export type CreateInventoryCatalogItemWithStockBody = z.infer<
  typeof createInventoryCatalogItemWithStockBodySchema
>
export type UpsertInventoryStockBody = z.infer<typeof upsertInventoryStockBodySchema>
export type TransferInventoryStockBody = z.infer<typeof transferInventoryStockBodySchema>
export type PatchInventoryStockBody = z.infer<typeof patchInventoryStockBodySchema>
