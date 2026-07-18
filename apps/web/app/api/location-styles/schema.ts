import { z } from 'zod'

import { isAllowedVisionGatewayModel } from '@/lib/chat/gateway-chat-models'
import { styleSpecSchema } from '@/lib/location-styles/style-spec'

export const createLocationStyleBodySchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().trim().min(1).max(128),
  rules: z.string().trim().min(1).max(4000),
  referenceImageName: z.string().trim().min(1).max(512),
  isDefault: z.boolean().optional(),
  styleSpec: styleSpecSchema.optional(),
})

export const updateLocationStyleBodySchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    rules: z.string().trim().min(1).max(4000).optional(),
    referenceImageName: z.string().trim().min(1).max(512).optional(),
    isDefault: z.boolean().optional(),
    styleSpec: styleSpecSchema.optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.rules !== undefined ||
      body.referenceImageName !== undefined ||
      body.isDefault !== undefined ||
      body.styleSpec !== undefined,
    { message: 'At least one field is required' },
  )

export const draftFromImageBodySchema = z.object({
  mediaName: z.string().trim().min(1).max(512),
  intent: z.string().trim().max(2000).optional(),
  model: z
    .string()
    .trim()
    .min(1)
    .refine(isAllowedVisionGatewayModel, { message: 'Model is not allowlisted for vision' }),
})
