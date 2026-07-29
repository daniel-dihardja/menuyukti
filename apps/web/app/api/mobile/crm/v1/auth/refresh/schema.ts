import { z } from 'zod'

export const mobileRefreshBodySchema = z.object({
  refreshToken: z.string().trim().min(1, 'refreshToken is required'),
})

export type MobileRefreshBody = z.infer<typeof mobileRefreshBodySchema>
