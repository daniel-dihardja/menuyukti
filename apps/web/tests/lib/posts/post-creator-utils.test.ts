import { describe, expect, it } from 'vitest'

import {
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import {
  resolveGenerationOutputDimensions,
  resolveUsePreviousResultForPage,
} from '@/lib/posts/post-creator-utils'

const PREVIEW_KEY = 'users/user_test/posts/11111111-1111-1111-1111-111111111111.webp'

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

describe('resolveUsePreviousResultForPage', () => {
  it('returns false when a layout template is active', () => {
    expect(
      resolveUsePreviousResultForPage(
        {
          templateImage: {
            name: 'layout.webp',
            url: 'https://example.com/layout.webp',
            enabled: true,
          },
          usePreviousResult: true,
          mediaS3Key: PREVIEW_KEY,
        },
        PREVIEW_KEY,
      ),
    ).toBe(false)
  })

  it('defaults to true when a preview exists and no template is set', () => {
    expect(
      resolveUsePreviousResultForPage(
        {
          templateImage: null,
          usePreviousResult: undefined,
          mediaS3Key: PREVIEW_KEY,
        },
        PREVIEW_KEY,
      ),
    ).toBe(true)
  })
})
