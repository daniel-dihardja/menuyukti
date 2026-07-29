import { z } from 'zod'

import { isSafePhotoFilename } from '@/lib/assets/storage'

export const createMediaCollectionBodySchema = z.object({
  name: z.string().trim().min(1).max(128),
})

export const updateMediaCollectionBodySchema = z.object({
  name: z.string().trim().min(1).max(128),
})

export const mediaCollectionMemberBodySchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine(isSafePhotoFilename, { message: 'Invalid photo filename' }),
})
