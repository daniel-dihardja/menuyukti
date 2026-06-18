import { describe, expect, it } from 'vitest'

import {
  getIgStoryMediaType,
  igStoryContentTypeForFilename,
  isObjectKeyForIgStory,
  isSafeIgStoryFilename,
  userIgStoriesObjectKey,
  userIgStoriesPrefix,
} from '@/lib/assets/storage'

const USER_ID = 'user_abc123'
const VALID_IMAGE = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'
const VALID_VIDEO = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4'

describe('userIgStoriesPrefix', () => {
  it('returns users/{userId}/igstories/', () => {
    expect(userIgStoriesPrefix(USER_ID)).toBe('users/user_abc123/igstories/')
  })
})

describe('userIgStoriesObjectKey', () => {
  it('returns full S3 key under igstories subfolder', () => {
    expect(userIgStoriesObjectKey(USER_ID, VALID_IMAGE)).toBe(
      `users/${USER_ID}/igstories/${VALID_IMAGE}`,
    )
  })
})

describe('isSafeIgStoryFilename', () => {
  it('accepts uuid.webp', () => {
    expect(isSafeIgStoryFilename(VALID_IMAGE)).toBe(true)
  })

  it('accepts uuid video extensions', () => {
    expect(isSafeIgStoryFilename(VALID_VIDEO)).toBe(true)
    expect(isSafeIgStoryFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.mov')).toBe(true)
    expect(isSafeIgStoryFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm')).toBe(true)
  })

  it('rejects unsafe filenames', () => {
    expect(isSafeIgStoryFilename('not-a-uuid.webp')).toBe(false)
    expect(isSafeIgStoryFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.avi')).toBe(false)
  })
})

describe('getIgStoryMediaType', () => {
  it('returns image or video from extension', () => {
    expect(getIgStoryMediaType(VALID_IMAGE)).toBe('image')
    expect(getIgStoryMediaType(VALID_VIDEO)).toBe('video')
    expect(getIgStoryMediaType('bad-name.mp4')).toBe(null)
  })
})

describe('igStoryContentTypeForFilename', () => {
  it('maps extensions to MIME types', () => {
    expect(igStoryContentTypeForFilename(VALID_IMAGE)).toBe('image/webp')
    expect(igStoryContentTypeForFilename(VALID_VIDEO)).toBe('video/mp4')
    expect(igStoryContentTypeForFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.mov')).toBe(
      'video/quicktime',
    )
  })
})

describe('isObjectKeyForIgStory', () => {
  it('accepts valid ig story keys', () => {
    const key = userIgStoriesObjectKey(USER_ID, VALID_VIDEO)
    expect(isObjectKeyForIgStory(key, USER_ID)).toBe(true)
  })

  it('rejects reel keys', () => {
    const key = `users/${USER_ID}/reels/${VALID_VIDEO}`
    expect(isObjectKeyForIgStory(key, USER_ID)).toBe(false)
  })

  it('rejects keys for other users', () => {
    const key = userIgStoriesObjectKey('other_user', VALID_VIDEO)
    expect(isObjectKeyForIgStory(key, USER_ID)).toBe(false)
  })

  it('rejects path traversal', () => {
    const key = `users/${USER_ID}/igstories/../${VALID_VIDEO}`
    expect(isObjectKeyForIgStory(key, USER_ID)).toBe(false)
  })
})
