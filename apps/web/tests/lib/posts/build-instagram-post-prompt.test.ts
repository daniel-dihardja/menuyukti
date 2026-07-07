import { describe, expect, it } from 'vitest'

import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import { buildInstagramPostPrompt } from '@/lib/posts/build-instagram-post-prompt'

describe('buildInstagramPostPrompt', () => {
  it('places trimmed user prompt under CREATIVE DIRECTION', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: '  Warm kopitiam scene with kaya toast  ',
    })

    expect(out).toContain("CREATIVE DIRECTION (follow the user's vision):")
    expect(out.endsWith('Warm kopitiam scene with kaya toast')).toBe(true)
  })

  it('includes composition frame percentages derived from constants', () => {
    const out = buildInstagramPostPrompt({ userPrompt: 'Test scene' })

    expect(out).toContain(
      `~${INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT.toFixed(1)}% from the left and right edges`,
    )
    expect(out).toContain(
      `~${INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT.toFixed(1)}% from the top and bottom`,
    )
    expect(out).toContain(`${POST_IMAGE_WIDTH}×${POST_IMAGE_HEIGHT}`)
    expect(out).toContain('never draw, outline, or render it')
    expect(out).toContain('Do not add visible guides, boxes, rectangles')
  })

  it('includes reference block when referenceImageCount > 0', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Hero dish on marble',
      referenceImageCount: 2,
    })

    expect(out).toContain('REFERENCE IMAGES:')
    expect(out).toContain('You receive 2 reference photo(s)')
    expect(out).toContain("Preserve each product's identity")
  })

  it('omits reference block when referenceImageCount is 0', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Hero dish on marble',
      referenceImageCount: 0,
    })

    expect(out).not.toContain('REFERENCE IMAGES:')
  })

  it('places foundation sections before creative direction', () => {
    const out = buildInstagramPostPrompt({ userPrompt: 'My creative brief' })

    const outputIndex = out.indexOf('OUTPUT:')
    const compositionIndex = out.indexOf('COMPOSITION (NON-NEGOTIABLE):')
    const creativeIndex = out.indexOf('CREATIVE DIRECTION')

    expect(outputIndex).toBeGreaterThanOrEqual(0)
    expect(compositionIndex).toBeGreaterThan(outputIndex)
    expect(creativeIndex).toBeGreaterThan(compositionIndex)
  })
})
