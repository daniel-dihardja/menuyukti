import { z } from 'zod'

export const mobileChallengeBodySchema = z.object({
  deviceId: z.string().uuid('deviceId must be a valid UUID'),
})

export type MobileChallengeBody = z.infer<typeof mobileChallengeBodySchema>
