import { z } from 'zod'

export const mobileRevokeBodySchema = z.object({
  refreshToken: z.string().trim().min(1).optional(),
})

export type MobileRevokeBody = z.infer<typeof mobileRevokeBodySchema>
