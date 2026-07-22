import { z } from 'zod'

export const workflowIdParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

export const itemIdParamSchema = z.string().regex(/^\d+$/, 'Invalid Instagram item id')

export const instagramItemKindSchema = z.enum(['story', 'post', 'reel'])

export const instagramItemStatusSchema = z.enum(['draft', 'ready'])

export const createInstagramItemBodySchema = z.object({
  kind: instagramItemKindSchema.default('post'),
  title: z.string().max(256).optional(),
})

export const patchInstagramItemBodySchema = z
  .object({
    kind: instagramItemKindSchema.optional(),
    title: z.string().max(256).optional(),
    caption: z.string().optional(),
    hook: z.string().optional(),
    visualBrief: z.string().optional(),
    status: instagramItemStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.kind !== undefined ||
      value.title !== undefined ||
      value.caption !== undefined ||
      value.hook !== undefined ||
      value.visualBrief !== undefined ||
      value.status !== undefined,
    { message: 'At least one field is required' },
  )
