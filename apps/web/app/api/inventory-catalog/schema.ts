import { z } from 'zod'

import { INVENTORY_STORAGE_ZONES } from '@/lib/inventar/storage-zones'

const storageZoneSchema = z.enum(INVENTORY_STORAGE_ZONES)

const optionalOnHandLimitSchema = z.number().nonnegative().nullable().optional()

function refineOnHandLimits<T extends { minOnHand?: number | null; maxOnHand?: number | null }>(
  data: T,
): boolean {
  if (data.minOnHand == null || data.maxOnHand == null) return true
  return data.minOnHand <= data.maxOnHand
}

export const createInventoryCatalogBodySchema = z
  .object({
    workspaceId: z.number().int().positive(),
    name: z.string().trim().min(1).max(256),
    packageSize: z.number().positive(),
    packageUnit: z.string().trim().min(1).max(32),
    storageZone: storageZoneSchema.optional().default('dry'),
    price: z.number().nonnegative().nullable().optional(),
    minOnHand: optionalOnHandLimitSchema,
    maxOnHand: optionalOnHandLimitSchema,
  })
  .refine(refineOnHandLimits, {
    message: 'minOnHand cannot be greater than maxOnHand',
    path: ['minOnHand'],
  })

export const updateInventoryCatalogBodySchema = z
  .object({
    name: z.string().trim().min(1).max(256).optional(),
    packageSize: z.number().positive().optional(),
    packageUnit: z.string().trim().min(1).max(32).optional(),
    storageZone: storageZoneSchema.optional(),
    price: z.number().nonnegative().nullable().optional(),
    minOnHand: optionalOnHandLimitSchema,
    maxOnHand: optionalOnHandLimitSchema,
  })
  .refine(refineOnHandLimits, {
    message: 'minOnHand cannot be greater than maxOnHand',
    path: ['minOnHand'],
  })

export type CreateInventoryCatalogBody = z.infer<typeof createInventoryCatalogBodySchema>
export type UpdateInventoryCatalogBody = z.infer<typeof updateInventoryCatalogBodySchema>
