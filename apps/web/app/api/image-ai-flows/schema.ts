import { z } from 'zod'

export const createImageAiFlowBodySchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  prompt: z.string().min(1),
  model: z.string().min(1),
  promptEnhance: z.string().nullable().optional(),
  imageReferenceStrength: z.string().nullable().optional(),
  styleIds: z.union([z.array(z.string()), z.null()]).optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
})

export const updateImageAiFlowBodySchema = z.object({
  newSlug: z.string().nullable().optional(),
  displayName: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  promptEnhance: z.string().nullable().optional(),
  imageReferenceStrength: z.string().nullable().optional(),
  styleIds: z.union([z.array(z.string()), z.null()]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})
