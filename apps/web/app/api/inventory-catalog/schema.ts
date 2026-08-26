import { z } from 'zod'

export const createInventoryCatalogBodySchema = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().trim().min(1).max(256),
  packageSize: z.number().positive(),
  packageUnit: z.string().trim().min(1).max(32),
})

export const updateInventoryCatalogBodySchema = z.object({
  name: z.string().trim().min(1).max(256).optional(),
  packageSize: z.number().positive().optional(),
  packageUnit: z.string().trim().min(1).max(32).optional(),
})

export type CreateInventoryCatalogBody = z.infer<typeof createInventoryCatalogBodySchema>
export type UpdateInventoryCatalogBody = z.infer<typeof updateInventoryCatalogBodySchema>
