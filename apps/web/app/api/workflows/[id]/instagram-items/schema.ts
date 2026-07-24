import { z } from 'zod'

export const workflowIdParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

export const itemIdParamSchema = z.string().regex(/^\d+$/, 'Invalid Instagram item id')

export const pageIdParamSchema = z.string().regex(/^\d+$/, 'Invalid Instagram item page id')

export const instagramItemKindSchema = z.enum(['story', 'post', 'reel'])

export const instagramItemStatusSchema = z.enum(['draft', 'ready'])

const scheduleSchema = z.string().datetime({ offset: true }).nullable()

const photoFilenameSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|jpeg|png|gif|avif|tif|tiff)$/i,
    'Invalid photo filename',
  )

export const referenceImageSchema = z.object({
  name: photoFilenameSchema,
  enabled: z.boolean().default(true),
})

export const createInstagramItemBodySchema = z.object({
  kind: instagramItemKindSchema.default('post'),
  title: z.string().max(256).optional(),
  caption: z.string().optional(),
  hook: z.string().optional(),
  visualBrief: z.string().optional(),
  status: instagramItemStatusSchema.optional(),
  schedule: scheduleSchema.optional(),
})

export const patchInstagramItemBodySchema = z
  .object({
    kind: instagramItemKindSchema.optional(),
    title: z.string().max(256).optional(),
    caption: z.string().optional(),
    hook: z.string().optional(),
    visualBrief: z.string().optional(),
    referenceImages: z.array(referenceImageSchema).max(5).optional(),
    styleId: z.number().int().positive().nullable().optional(),
    status: instagramItemStatusSchema.optional(),
    schedule: scheduleSchema.optional(),
  })
  .refine(
    (value) =>
      value.kind !== undefined ||
      value.title !== undefined ||
      value.caption !== undefined ||
      value.hook !== undefined ||
      value.visualBrief !== undefined ||
      value.referenceImages !== undefined ||
      value.styleId !== undefined ||
      value.status !== undefined ||
      value.schedule !== undefined,
    { message: 'At least one field is required' },
  )

export const createInstagramItemPageBodySchema = z.object({
  copyFromPageId: z.string().regex(/^\d+$/).optional(),
})

export const patchInstagramItemPageBodySchema = z
  .object({
    mediaS3Key: z.string().trim().min(1).optional(),
    prompt: z.string().optional(),
  })
  .refine((value) => value.mediaS3Key !== undefined || value.prompt !== undefined, {
    message: 'At least one field is required',
  })

export const deleteInstagramItemPageMediaVersionBodySchema = z.object({
  mediaS3Key: z.string().trim().min(1),
})

export const MAX_INSTAGRAM_ITEM_PAGES = 10
