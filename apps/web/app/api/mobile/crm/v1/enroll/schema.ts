import { z } from 'zod'

/** E.164: + and 7–15 digits (country code first digit 1–9). Matches GraphQL enroll. */
const e164PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'phoneE164 must be a valid E.164 number')

/** Hex-encoded Ed25519 public key (32 bytes). Matches GraphQL enroll. */
const ed25519PublicKeyHexSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{64}$/, 'publicKey must be a 64-character hex-encoded Ed25519 public key')

export const mobileEnrollBodySchema = z.object({
  token: z.string().trim().min(1, 'token is required'),
  appId: z.string().uuid('appId must be a valid UUID'),
  publicKey: ed25519PublicKeyHexSchema,
  platform: z
    .string()
    .trim()
    .min(1, 'platform is required')
    .max(64, 'platform must be at most 64 characters'),
  phoneE164: e164PhoneSchema.optional(),
})

export type MobileEnrollBody = z.infer<typeof mobileEnrollBodySchema>
