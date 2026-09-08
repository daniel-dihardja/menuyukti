import { z } from 'zod'

import { INVENTORY_CATEGORIES } from '@/lib/inventar/categories'
import { INVENTORY_STORAGE_ZONES } from '@/lib/inventar/storage-zones'

const storageZoneSchema = z.enum(INVENTORY_STORAGE_ZONES)
const categorySchema = z.enum(INVENTORY_CATEGORIES)

export const createInventoryCatalogBodySchema = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().trim().min(1).max(256),
  packageSize: z.number().positive(),
  packageUnit: z.string().trim().min(1).max(32),
  storageZone: storageZoneSchema.optional().default('dry'),
  category: categorySchema.optional().default('other'),
  price: z.number().nonnegative().nullable().optional(),
})

export const updateInventoryCatalogBodySchema = z.object({
  name: z.string().trim().min(1).max(256).optional(),
  packageSize: z.number().positive().optional(),
  packageUnit: z.string().trim().min(1).max(32).optional(),
  storageZone: storageZoneSchema.optional(),
  category: categorySchema.optional(),
  price: z.number().nonnegative().nullable().optional(),
})

export type CreateInventoryCatalogBody = z.infer<typeof createInventoryCatalogBodySchema>
export type UpdateInventoryCatalogBody = z.infer<typeof updateInventoryCatalogBodySchema>
