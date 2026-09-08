import { z } from 'zod'

export const createLocationAreaBodySchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().trim().min(1).max(128),
  sortOrder: z.number().int().optional(),
})

export const updateLocationAreaBodySchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((value) => value.name !== undefined || value.sortOrder !== undefined, {
    message: 'Provide name and/or sortOrder',
  })

export type CreateLocationAreaBody = z.infer<typeof createLocationAreaBodySchema>
export type UpdateLocationAreaBody = z.infer<typeof updateLocationAreaBodySchema>
