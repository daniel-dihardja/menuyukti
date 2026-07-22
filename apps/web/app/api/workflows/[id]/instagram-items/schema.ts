import { z } from 'zod'

export const workflowIdParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

export const itemIdParamSchema = z.string().regex(/^\d+$/, 'Invalid Instagram item id')

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
    /** Commit an existing media version as the item image. */
    mediaS3Key: z.string().trim().min(1).optional(),
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
      value.schedule !== undefined ||
      value.mediaS3Key !== undefined,
    { message: 'At least one field is required' },
  )

export const deleteInstagramItemMediaVersionBodySchema = z.object({
  mediaS3Key: z.string().trim().min(1),
})
