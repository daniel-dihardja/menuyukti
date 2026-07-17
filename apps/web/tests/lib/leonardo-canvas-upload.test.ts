import { describe, expect, it } from 'vitest'

import { parseCanvasInitImageResponse } from '@/lib/leonardo'

describe('parseCanvasInitImageResponse', () => {
  it('parses Leonardo live API plural mask field names', () => {
    const parsed = parseCanvasInitImageResponse({
      uploadCanvasInitImage: {
        initImageId: 'init-1',
        initFields: '{}',
        initUrl: 'https://example.com/init',
        masksImageId: 'mask-1',
        masksFields: '{}',
        masksUrl: 'https://example.com/mask',
      },
    })

    expect(parsed).toEqual({
      canvasInitId: 'init-1',
      initUrl: 'https://example.com/init',
      initFields: '{}',
      canvasMaskId: 'mask-1',
      maskUrl: 'https://example.com/mask',
      maskFields: '{}',
    })
  })

  it('accepts documented singular mask field names', () => {
    const parsed = parseCanvasInitImageResponse({
      uploadCanvasInitImage: {
        initImageId: 'init-1',
        initFields: '{}',
        initUrl: 'https://example.com/init',
        maskImageId: 'mask-1',
        maskFields: '{}',
        maskUrl: 'https://example.com/mask',
      },
    })

    expect(parsed?.canvasMaskId).toBe('mask-1')
    expect(parsed?.maskUrl).toBe('https://example.com/mask')
  })
})
