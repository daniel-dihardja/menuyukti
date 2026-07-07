import { describe, expect, it } from 'vitest'

import {
  isObjectKeyForPost,
  isObjectKeyForUser,
  parsePostObjectKey,
  userPostsObjectKey,
  userPostsPrefix,
} from '@/lib/assets/storage'

const USER_ID = 'user_abc123'
const VALID_FILENAME = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'

describe('userPostsPrefix', () => {
  it('returns users/{userId}/posts/', () => {
    expect(userPostsPrefix(USER_ID)).toBe('users/user_abc123/posts/')
  })
})

describe('userPostsObjectKey', () => {
  it('returns full S3 key under posts subfolder', () => {
    expect(userPostsObjectKey(USER_ID, VALID_FILENAME)).toBe(
      `users/${USER_ID}/posts/${VALID_FILENAME}`,
    )
  })
})

describe('isObjectKeyForPost', () => {
  it('accepts valid post keys', () => {
    const key = userPostsObjectKey(USER_ID, VALID_FILENAME)
    expect(isObjectKeyForPost(key, USER_ID)).toBe(true)
  })

  it('rejects studio product keys at user root', () => {
    const key = `users/${USER_ID}/${VALID_FILENAME}`
    expect(isObjectKeyForPost(key, USER_ID)).toBe(false)
    expect(isObjectKeyForUser(key, USER_ID)).toBe(true)
  })

  it('rejects keys for other users', () => {
    const key = userPostsObjectKey('other_user', VALID_FILENAME)
    expect(isObjectKeyForPost(key, USER_ID)).toBe(false)
  })

  it('rejects path traversal', () => {
    const key = `users/${USER_ID}/posts/../${VALID_FILENAME}`
    expect(isObjectKeyForPost(key, USER_ID)).toBe(false)
  })

  it('rejects unsafe filenames', () => {
    const key = `users/${USER_ID}/posts/not-a-uuid.webp`
    expect(isObjectKeyForPost(key, USER_ID)).toBe(false)
  })
})

describe('parsePostObjectKey', () => {
  it('parses valid post keys', () => {
    const key = userPostsObjectKey(USER_ID, VALID_FILENAME)
    expect(parsePostObjectKey(key)).toEqual({
      userId: USER_ID,
      filename: VALID_FILENAME,
    })
  })

  it('rejects invalid keys', () => {
    expect(parsePostObjectKey(`users/${USER_ID}/${VALID_FILENAME}`)).toBeNull()
    expect(parsePostObjectKey(`users/${USER_ID}/posts/not-a-uuid.webp`)).toBeNull()
  })
})
