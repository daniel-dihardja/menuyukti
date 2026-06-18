import { describe, expect, it } from 'vitest'

import {
  isObjectKeyForPhoto,
  isObjectKeyForUser,
  userPhotosObjectKey,
  userPhotosPrefix,
} from '@/lib/assets/storage'

const USER_ID = 'user_abc123'
const VALID_FILENAME = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'

describe('userPhotosPrefix', () => {
  it('returns users/{userId}/photos/', () => {
    expect(userPhotosPrefix(USER_ID)).toBe('users/user_abc123/photos/')
  })
})

describe('userPhotosObjectKey', () => {
  it('returns full S3 key under photos subfolder', () => {
    expect(userPhotosObjectKey(USER_ID, VALID_FILENAME)).toBe(
      `users/${USER_ID}/photos/${VALID_FILENAME}`,
    )
  })
})

describe('isObjectKeyForPhoto', () => {
  it('accepts valid photo keys', () => {
    const key = userPhotosObjectKey(USER_ID, VALID_FILENAME)
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(true)
  })

  it('rejects studio product keys at user root', () => {
    const key = `users/${USER_ID}/${VALID_FILENAME}`
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(false)
    expect(isObjectKeyForUser(key, USER_ID)).toBe(true)
  })

  it('rejects keys for other users', () => {
    const key = userPhotosObjectKey('other_user', VALID_FILENAME)
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(false)
  })

  it('rejects path traversal', () => {
    const key = `users/${USER_ID}/photos/../${VALID_FILENAME}`
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(false)
  })

  it('rejects unsafe filenames', () => {
    const key = `users/${USER_ID}/photos/not-a-uuid.webp`
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(false)
  })
})
