import { describe, expect, it } from 'vitest'

import {
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import {
  resolveGenerationOutputDimensions,
  resolvePreviewSourceForPage,
} from '@/lib/posts/post-creator-utils'

describe('resolveGenerationOutputDimensions', () => {
  it('uses previous-result size for filled-edit instead of default 4:5', () => {
    expect(
      resolveGenerationOutputDimensions({
        mode: 'filled-edit',
        previousResultDimensions: { width: 1080, height: 1080 },
      }),
    ).toEqual({ width: 1080, height: 1080 })
  })

  it('prefers template size for template-composite', () => {
    expect(
      resolveGenerationOutputDimensions({
        mode: 'template-composite',
        templateDimensions: { width: 1248, height: 1664 },
        previousResultDimensions: { width: 1080, height: 1080 },
      }),
    ).toEqual({ width: 1248, height: 1664 })
  })

  it('falls back to default portrait size when no references provide dimensions', () => {
    expect(resolveGenerationOutputDimensions({ mode: 'fresh-scene' })).toEqual({
      width: POST_IMAGE_WIDTH,
      height: POST_IMAGE_HEIGHT,
    })
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
