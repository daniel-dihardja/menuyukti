import { z } from 'zod'

/** PATCH body: post currently supports title updates only. */
export const patchPostSchema = z.object({
  title: z.string().trim().min(1).max(256),
})
