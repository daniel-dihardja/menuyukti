import { describe, expect, it } from 'vitest'

import {
  clampQualityForModel,
  formatAspectCss,
  formatAspectNumber,
  isQualityAvailable,
  resolveLeonardoOutputDimensions,
  snapToNearestLeonardoPair,
} from '@/lib/posts/leonardo-post-dimensions'
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

describe('resolveLeonardoOutputDimensions', () => {
  it('uses Nano Banana 2 documented pairs for each format at Standard', () => {
    expect(
      resolveLeonardoOutputDimensions({
        model: 'nano-banana-2',
        format: 'feed',
        quality: 'standard',
      }),
    ).toEqual({ width: 928, height: 1152 })
    expect(
      resolveLeonardoOutputDimensions({
        model: 'nano-banana-2',
        format: 'tall',
        quality: 'standard',
      }),
    ).toEqual({ width: 896, height: 1200 })
    expect(
      resolveLeonardoOutputDimensions({
        model: 'nano-banana-2',
        format: 'square',
        quality: 'standard',
      }),
    ).toEqual({ width: 1024, height: 1024 })
    expect(
      resolveLeonardoOutputDimensions({
        model: 'nano-banana-2',
        format: 'story',
        quality: 'standard',
      }),
    ).toEqual({ width: 768, height: 1376 })
    expect(
      resolveLeonardoOutputDimensions({
        model: 'nano-banana-2',
        format: 'wide',
        quality: 'standard',
      }),
    ).toEqual({ width: 1376, height: 768 })
  })

  it('uses High and Ultra tiers for Nano Banana 2 Feed', () => {
    expect(
      resolveLeonardoOutputDimensions({
        model: 'nano-banana-2',
        format: 'feed',
        quality: 'high',
      }),
    ).toEqual({ width: 1856, height: 2304 })
    expect(
      resolveLeonardoOutputDimensions({
        model: 'nano-banana-2',
        format: 'feed',
        quality: 'ultra',
      }),
    ).toEqual({ width: 3712, height: 4608 })
  })

  it('clamps Ultra to High for Flash', () => {
    expect(isQualityAvailable('gemini-2.5-flash-image', 'ultra')).toBe(false)
    expect(clampQualityForModel('gemini-2.5-flash-image', 'ultra')).toBe('high')
    const ultra = resolveLeonardoOutputDimensions({
      model: 'gemini-2.5-flash-image',
      format: 'square',
      quality: 'ultra',
    })
    const high = resolveLeonardoOutputDimensions({
      model: 'gemini-2.5-flash-image',
      format: 'square',
      quality: 'high',
    })
    expect(ultra).toEqual(high)
    expect(ultra.width).toBeLessThanOrEqual(1344)
    expect(ultra.height).toBeLessThanOrEqual(1344)
  })
})

describe('snapToNearestLeonardoPair', () => {
  it('preserves aspect ratio better than independent axis snaps', () => {
    // 4:5 target that would mismatch if snapped independently on Nano Banana 2
    const pair = snapToNearestLeonardoPair('nano-banana-2', 928, 1152)
    expect(pair).toEqual({ width: 928, height: 1152 })
  })

  it('finds a close pair for arbitrary template dims', () => {
    const pair = snapToNearestLeonardoPair('nano-banana-2', 1000, 1500)
    expect(pair.width / pair.height).toBeCloseTo(2 / 3, 1)
  })
})

describe('formatAspectCss', () => {
  it('returns CSS ratios for explicit formats', () => {
    expect(formatAspectCss('feed')).toBe('4 / 5')
    expect(formatAspectCss('tall')).toBe('3 / 4')
    expect(formatAspectCss('square')).toBe('1 / 1')
    expect(formatAspectCss('story')).toBe('9 / 16')
    expect(formatAspectCss('wide')).toBe('16 / 9')
  })
})

describe('formatAspectNumber', () => {
  it('returns width÷height for explicit formats', () => {
    expect(formatAspectNumber('feed')).toBeCloseTo(4 / 5)
    expect(formatAspectNumber('tall')).toBeCloseTo(3 / 4)
    expect(formatAspectNumber('square')).toBe(1)
    expect(formatAspectNumber('story')).toBeCloseTo(9 / 16)
    expect(formatAspectNumber('wide')).toBeCloseTo(16 / 9)
  })
})

describe('kindToPostImageFormat', () => {
  it('maps post to square and story/reel to story', async () => {
    const { kindToPostImageFormat } = await import('@/lib/posts/leonardo-post-dimensions')
    expect(kindToPostImageFormat('post')).toBe('square')
    expect(kindToPostImageFormat('story')).toBe('story')
    expect(kindToPostImageFormat('reel')).toBe('story')
    expect(kindToPostImageFormat('STORY')).toBe('story')
  })
})
