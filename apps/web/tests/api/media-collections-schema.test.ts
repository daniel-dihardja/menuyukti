import { describe, expect, it } from 'vitest'

import {
  createMediaCollectionBodySchema,
  mediaCollectionMemberBodySchema,
  updateMediaCollectionBodySchema,
} from '@/app/api/media/collections/schema'

describe('media collections body schemas', () => {
  it('accepts a valid collection name', () => {
    const parsed = createMediaCollectionBodySchema.safeParse({ name: 'Style references' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.name).toBe('Style references')
  })

  it('rejects empty collection name', () => {
    expect(createMediaCollectionBodySchema.safeParse({ name: '  ' }).success).toBe(false)
  })

  it('accepts rename body', () => {
    expect(updateMediaCollectionBodySchema.safeParse({ name: 'Hero dishes' }).success).toBe(true)
  })

  it('accepts safe photo filenames for membership', () => {
    const parsed = mediaCollectionMemberBodySchema.safeParse({
      filename: '11111111-1111-1111-1111-111111111111.webp',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects unsafe membership filenames', () => {
    expect(mediaCollectionMemberBodySchema.safeParse({ filename: '../secret.png' }).success).toBe(
      false,
    )
  })
})
