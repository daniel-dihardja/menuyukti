import { z } from 'zod'

export const PRESIGN_POSTS_MAX_KEYS = 32

export const presignPostsBodySchema = z.object({
  keys: z
    .array(z.string().trim().min(1).max(512))
    .min(1)
    .max(PRESIGN_POSTS_MAX_KEYS)
    .transform((keys) => [...new Set(keys)]),
})

export type PresignPostsBody = z.infer<typeof presignPostsBodySchema>
