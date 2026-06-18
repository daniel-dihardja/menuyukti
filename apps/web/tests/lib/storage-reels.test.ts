import { describe, expect, it } from 'vitest'

import {
  getReelMediaType,
  isObjectKeyForReel,
  isSafeReelFilename,
  reelContentTypeForFilename,
  userReelsObjectKey,
  userReelsPrefix,
} from '@/lib/assets/storage'

const USER_ID = 'user_abc123'
const VALID_IMAGE = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'
const VALID_VIDEO = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4'

describe('userReelsPrefix', () => {
  it('returns users/{userId}/reels/', () => {
    expect(userReelsPrefix(USER_ID)).toBe('users/user_abc123/reels/')
  })
})

describe('userReelsObjectKey', () => {
  it('returns full S3 key under reels subfolder', () => {
    expect(userReelsObjectKey(USER_ID, VALID_IMAGE)).toBe(`users/${USER_ID}/reels/${VALID_IMAGE}`)
  })
})

describe('isSafeReelFilename', () => {
  it('accepts uuid.webp', () => {
    expect(isSafeReelFilename(VALID_IMAGE)).toBe(true)
  })

  it('accepts uuid video extensions', () => {
    expect(isSafeReelFilename(VALID_VIDEO)).toBe(true)
    expect(isSafeReelFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.mov')).toBe(true)
    expect(isSafeReelFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm')).toBe(true)
  })

  it('rejects unsafe filenames', () => {
    expect(isSafeReelFilename('not-a-uuid.webp')).toBe(false)
    expect(isSafeReelFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.avi')).toBe(false)
  })
})

describe('getReelMediaType', () => {
  it('returns image or video from extension', () => {
    expect(getReelMediaType(VALID_IMAGE)).toBe('image')
    expect(getReelMediaType(VALID_VIDEO)).toBe('video')
    expect(getReelMediaType('bad-name.mp4')).toBe(null)
  })
})

describe('reelContentTypeForFilename', () => {
  it('maps extensions to MIME types', () => {
    expect(reelContentTypeForFilename(VALID_IMAGE)).toBe('image/webp')
    expect(reelContentTypeForFilename(VALID_VIDEO)).toBe('video/mp4')
    expect(reelContentTypeForFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.mov')).toBe(
      'video/quicktime',
    )
  })
})

describe('isObjectKeyForReel', () => {
  it('accepts valid reel keys', () => {
    const key = userReelsObjectKey(USER_ID, VALID_VIDEO)
    expect(isObjectKeyForReel(key, USER_ID)).toBe(true)
  })

  it('rejects photo keys', () => {
    const key = `users/${USER_ID}/photos/${VALID_IMAGE}`
    expect(isObjectKeyForReel(key, USER_ID)).toBe(false)
  })

  it('rejects keys for other users', () => {
    const key = userReelsObjectKey('other_user', VALID_VIDEO)
    expect(isObjectKeyForReel(key, USER_ID)).toBe(false)
  })

  it('rejects path traversal', () => {
    const key = `users/${USER_ID}/reels/../${VALID_VIDEO}`
    expect(isObjectKeyForReel(key, USER_ID)).toBe(false)
  })
})
