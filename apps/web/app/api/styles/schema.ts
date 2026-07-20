import { z } from 'zod'

import { isAllowedVisionGatewayModel } from '@/lib/chat/gateway-chat-models'
import { styleSpecSchema } from '@/lib/styles/style-spec'

export const createStyleBodySchema = z.object({
  name: z.string().trim().min(1).max(128),
  referenceImageName: z.string().trim().min(1).max(512),
  spec: styleSpecSchema,
  isDefault: z.boolean().optional(),
})

export const updateStyleBodySchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    referenceImageName: z.string().trim().min(1).max(512).optional(),
    spec: styleSpecSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.referenceImageName !== undefined ||
      body.spec !== undefined ||
      body.isDefault !== undefined,
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
