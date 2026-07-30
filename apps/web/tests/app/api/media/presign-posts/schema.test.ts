import { describe, expect, it } from 'vitest'

import {
  PRESIGN_POSTS_MAX_KEYS,
  presignPostsBodySchema,
} from '@/app/api/media/presign-posts/schema'

describe('presignPostsBodySchema', () => {
  it('accepts unique keys and dedupes', () => {
    const parsed = presignPostsBodySchema.safeParse({
      keys: [
        'workspaces/ws/posts/a.webp',
        'workspaces/ws/posts/a.webp',
        'workspaces/ws/posts/b.webp',
      ],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.keys).toEqual(['workspaces/ws/posts/a.webp', 'workspaces/ws/posts/b.webp'])
  })

  it('rejects empty keys array', () => {
    expect(presignPostsBodySchema.safeParse({ keys: [] }).success).toBe(false)
  })

  it('rejects more than max keys before dedupe', () => {
    const keys = Array.from({ length: PRESIGN_POSTS_MAX_KEYS + 1 }, (_, i) => `k${i}`)
    expect(presignPostsBodySchema.safeParse({ keys }).success).toBe(false)
  })

  it('rejects blank keys', () => {
    expect(presignPostsBodySchema.safeParse({ keys: ['  '] }).success).toBe(false)
  })
})
