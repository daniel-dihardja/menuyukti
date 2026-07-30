import { describe, expect, it } from 'vitest'

import {
  PRESIGN_PHOTOS_MAX_NAMES,
  presignPhotosBodySchema,
} from '@/app/api/media/presign-photos/schema'

const VALID = 'f72bd586-2e75-4017-8e23-0db2bb1c3781.png'
const VALID_B = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'

describe('presignPhotosBodySchema', () => {
  it('accepts unique names and dedupes', () => {
    const parsed = presignPhotosBodySchema.safeParse({
      names: [VALID, VALID, VALID_B],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.names).toEqual([VALID, VALID_B])
  })

  it('rejects empty names array', () => {
    expect(presignPhotosBodySchema.safeParse({ names: [] }).success).toBe(false)
  })

  it('rejects more than max names before dedupe', () => {
    const validNames = Array.from({ length: PRESIGN_PHOTOS_MAX_NAMES + 1 }, (_, i) => {
      const hex = i.toString(16).padStart(12, '0')
      return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-7890-abcd-ef1234567890.png`
    })
    expect(presignPhotosBodySchema.safeParse({ names: validNames }).success).toBe(false)
  })

  it('rejects unsafe filenames', () => {
    expect(presignPhotosBodySchema.safeParse({ names: ['not-a-uuid.webp'] }).success).toBe(false)
  })
})
