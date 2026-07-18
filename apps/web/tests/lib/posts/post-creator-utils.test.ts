import { describe, expect, it } from 'vitest'

import {
  resolveGenerationOutputDimensions,
  resolvePreviewSourceForPage,
} from '@/lib/posts/post-creator-utils'

describe('resolveGenerationOutputDimensions', () => {
  it('resolves Feed Standard for Nano Banana 2 to documented 4:5 pair', () => {
    expect(
      resolveGenerationOutputDimensions({
        model: 'nano-banana-2',
        format: 'feed',
        quality: 'standard',
      }),
    ).toEqual({ width: 928, height: 1152 })
  })

  it('resolves Square High for Nano Banana 2', () => {
    expect(
      resolveGenerationOutputDimensions({
        model: 'nano-banana-2',
        format: 'square',
        quality: 'high',
      }),
    ).toEqual({ width: 2048, height: 2048 })
  })

  it('snaps match-layout template dims to a ratio-preserving pair', () => {
    const result = resolveGenerationOutputDimensions({
      model: 'nano-banana-2',
      format: 'match-layout',
      quality: 'standard',
      templateDimensions: { width: 1248, height: 1664 },
    })
    // 1248/1664 = 0.75 → 3:4; nearest documented tall standard is 896×1200
    expect(result.width / result.height).toBeCloseTo(3 / 4, 2)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
  })

  it('clamps Flash Ultra to High when resolving', () => {
    const ultra = resolveGenerationOutputDimensions({
      model: 'gemini-2.5-flash-image',
      format: 'square',
      quality: 'ultra',
    })
    const high = resolveGenerationOutputDimensions({
      model: 'gemini-2.5-flash-image',
      format: 'square',
      quality: 'high',
    })
    expect(ultra).toEqual(high)
  })

  it('defaults to Feed Standard when format/quality omitted', () => {
    const result = resolveGenerationOutputDimensions({
      model: 'nano-banana-2',
    })
    expect(result).toEqual({ width: 928, height: 1152 })
  })

  it('ignores previous-result size — explicit format owns the canvas', () => {
    expect(
      resolveGenerationOutputDimensions({
        model: 'nano-banana-2',
        format: 'square',
        quality: 'standard',
      }),
    ).toEqual({ width: 1024, height: 1024 })
  })
})

describe('resolvePreviewSourceForPage', () => {
  it('returns stored previewSource when present', () => {
    expect(
      resolvePreviewSourceForPage({
        templateImage: null,
        previewSource: 'template',
      }),
    ).toBe('template')
  })

  it('defaults to template when a layout template is set', () => {
    expect(
      resolvePreviewSourceForPage({
        templateImage: {
          name: 'layout.webp',
          url: 'https://example.com/layout.webp',
          enabled: true,
        },
      }),
    ).toBe('template')
  })

  it('defaults to version when no template is set', () => {
    expect(resolvePreviewSourceForPage({ templateImage: null })).toBe('version')
  })
})
