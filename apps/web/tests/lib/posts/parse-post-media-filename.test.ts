import { describe, expect, it } from 'vitest'

import { userPostsObjectKey, workspacePostsObjectKey } from '@/lib/assets/storage'
import { parsePostMediaFilename } from '@/lib/posts/parse-post-media-filename'

const USER_ID = 'user_abc123'
const WORKSPACE_ID = '42'
const VALID_FILENAME = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'

describe('parsePostMediaFilename', () => {
  it('returns filename for valid user post media keys', () => {
    const key = userPostsObjectKey(USER_ID, VALID_FILENAME)
    expect(parsePostMediaFilename(key)).toBe(VALID_FILENAME)
  })

  it('returns filename for valid workspace post media keys', () => {
    const key = workspacePostsObjectKey(WORKSPACE_ID, VALID_FILENAME)
    expect(parsePostMediaFilename(key)).toBe(VALID_FILENAME)
  })

  it('returns null for null, undefined, or empty input', () => {
    expect(parsePostMediaFilename(null)).toBeNull()
    expect(parsePostMediaFilename(undefined)).toBeNull()
    expect(parsePostMediaFilename('')).toBeNull()
  })

  it('returns null for non-post keys', () => {
    expect(parsePostMediaFilename(`users/${USER_ID}/${VALID_FILENAME}`)).toBeNull()
    expect(parsePostMediaFilename(`users/${USER_ID}/posts/not-a-uuid.webp`)).toBeNull()
  })
})
