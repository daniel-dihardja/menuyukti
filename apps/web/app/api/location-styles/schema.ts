import { z } from 'zod'

export const createLocationStyleBodySchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().trim().min(1).max(128),
  rules: z.string().trim().min(1).max(4000),
  referenceImageName: z.string().trim().min(1).max(512),
  isDefault: z.boolean().optional(),
})

export const updateLocationStyleBodySchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    rules: z.string().trim().min(1).max(4000).optional(),
    referenceImageName: z.string().trim().min(1).max(512).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.rules !== undefined ||
      body.referenceImageName !== undefined ||
      body.isDefault !== undefined,
    { message: 'At least one field is required' },
  )
