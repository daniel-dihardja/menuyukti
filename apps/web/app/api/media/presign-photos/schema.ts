import { z } from 'zod'

import { isSafePhotoFilename } from '@/lib/assets/storage'
import { ATTACHED_MEDIA_PRESIGN_MAX } from '@/lib/chat/hydrate-attached-media-urls'

export const PRESIGN_PHOTOS_MAX_NAMES = ATTACHED_MEDIA_PRESIGN_MAX

export const presignPhotosBodySchema = z.object({
  names: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(256)
        .refine(isSafePhotoFilename, { message: 'Invalid photo filename' }),
    )
    .min(1)
    .max(PRESIGN_PHOTOS_MAX_NAMES)
    .transform((names) => [...new Set(names)]),
})

export type PresignPhotosBody = z.infer<typeof presignPhotosBodySchema>
