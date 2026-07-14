import { describe, expect, it } from 'vitest'

import {
  isObjectKeyForPhoto,
  isObjectKeyForUser,
  isSafePhotoFilename,
  userPhotosObjectKey,
  userPhotosPrefix,
} from '@/lib/assets/storage'

const USER_ID = 'user_abc123'
const VALID_WEBP_FILENAME = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'
const VALID_JPG_FILENAME = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg'

describe('userPhotosPrefix', () => {
  it('returns users/{userId}/photos/', () => {
    expect(userPhotosPrefix(USER_ID)).toBe('users/user_abc123/photos/')
  })
})

describe('userPhotosObjectKey', () => {
  it('returns full S3 key under photos subfolder', () => {
    expect(userPhotosObjectKey(USER_ID, VALID_WEBP_FILENAME)).toBe(
      `users/${USER_ID}/photos/${VALID_WEBP_FILENAME}`,
    )
  })
})

describe('isSafePhotoFilename', () => {
  it('accepts common image extensions', () => {
    expect(isSafePhotoFilename(VALID_WEBP_FILENAME)).toBe(true)
    expect(isSafePhotoFilename(VALID_JPG_FILENAME)).toBe(true)
    expect(isSafePhotoFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.png')).toBe(true)
  })

  it('rejects unsafe filenames', () => {
    expect(isSafePhotoFilename('not-a-uuid.webp')).toBe(false)
    expect(isSafePhotoFilename(`${VALID_WEBP_FILENAME}.exe`)).toBe(false)
  })
})

describe('isObjectKeyForPhoto', () => {
  it('accepts valid photo keys', () => {
    const key = userPhotosObjectKey(USER_ID, VALID_WEBP_FILENAME)
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(true)
  })

  it('accepts non-webp photo keys', () => {
    const key = userPhotosObjectKey(USER_ID, VALID_JPG_FILENAME)
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(true)
  })

  it('rejects studio product keys at user root', () => {
    const key = `users/${USER_ID}/${VALID_WEBP_FILENAME}`
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(false)
    expect(isObjectKeyForUser(key, USER_ID)).toBe(true)
  })

  it('rejects keys for other users', () => {
    const key = userPhotosObjectKey('other_user', VALID_WEBP_FILENAME)
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(false)
  })

  it('rejects path traversal', () => {
    const key = `users/${USER_ID}/photos/../${VALID_WEBP_FILENAME}`
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(false)
  })

  it('rejects unsafe filenames', () => {
    const key = `users/${USER_ID}/photos/not-a-uuid.webp`
    expect(isObjectKeyForPhoto(key, USER_ID)).toBe(false)
  })
})
