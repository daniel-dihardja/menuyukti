import { z } from 'zod'

export const mobileVerifyBodySchema = z.object({
  deviceId: z.string().uuid('deviceId must be a valid UUID'),
  challengeId: z.string().uuid('challengeId must be a valid UUID'),
  signature: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{128}$/, 'signature must be a 128-character hex Ed25519 signature'),
})

export type MobileVerifyBody = z.infer<typeof mobileVerifyBodySchema>
