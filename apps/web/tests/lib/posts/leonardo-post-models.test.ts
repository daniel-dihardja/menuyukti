import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LEONARDO_POST_MODEL,
  getLeonardoPostModelMessageKey,
  isLeonardoPostModelId,
  snapLeonardoPostDimension,
} from '@/lib/posts/leonardo-post-models'

describe('isLeonardoPostModelId', () => {
  it('accepts the three post-generation model ids', () => {
    expect(isLeonardoPostModelId('gemini-2.5-flash-image')).toBe(true)
    expect(isLeonardoPostModelId('nano-banana-2')).toBe(true)
    expect(isLeonardoPostModelId('gemini-image-2')).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isLeonardoPostModelId('lucid-origin')).toBe(false)
    expect(isLeonardoPostModelId('')).toBe(false)
    expect(isLeonardoPostModelId(null)).toBe(false)
  })
})

describe('DEFAULT_LEONARDO_POST_MODEL', () => {
  it('defaults to Nano Banana (Flash)', () => {
    expect(DEFAULT_LEONARDO_POST_MODEL).toBe('gemini-2.5-flash-image')
  })
})

describe('getLeonardoPostModelMessageKey', () => {
  it('uses dot-free keys for next-intl', () => {
    expect(getLeonardoPostModelMessageKey('gemini-2.5-flash-image')).toBe('flash')
    expect(getLeonardoPostModelMessageKey('nano-banana-2')).toBe('nanoBanana2')
    expect(getLeonardoPostModelMessageKey('gemini-image-2')).toBe('pro')
  })
})

describe('snapLeonardoPostDimension', () => {
  it('snaps 1080 to 1024 for Flash', () => {
    expect(snapLeonardoPostDimension('gemini-2.5-flash-image', 1080, 'width')).toBe(1024)
    expect(snapLeonardoPostDimension('gemini-2.5-flash-image', 1080, 'height')).toBe(1024)
  })

  it('keeps Flash within its allowed dim list', () => {
    expect(snapLeonardoPostDimension('gemini-2.5-flash-image', 4096, 'width')).toBe(1344)
  })

  it('allows Pro larger dimensions than Flash', () => {
    expect(snapLeonardoPostDimension('gemini-image-2', 1080, 'width')).toBe(1024)
    expect(snapLeonardoPostDimension('gemini-image-2', 4096, 'width')).toBe(4096)
    expect(snapLeonardoPostDimension('gemini-image-2', 4600, 'height')).toBe(4608)
  })

  it('uses width vs height lists for Nano Banana 2', () => {
    expect(snapLeonardoPostDimension('nano-banana-2', 670, 'width')).toBe(768)
    expect(snapLeonardoPostDimension('nano-banana-2', 670, 'height')).toBe(672)
  })
})
