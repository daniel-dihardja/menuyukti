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

  it('includes indexed photo reference block when only photos are provided', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Hero dish on marble',
      references: [{ type: 'photo' }, { type: 'photo' }],
    })

    expect(out).toContain('REFERENCE IMAGES (in upload order):')
    expect(out).toContain('Reference 1 — PRODUCT PHOTO')
    expect(out).toContain('Reference 2 — PRODUCT PHOTO')
    expect(out).toContain('Preserve product identity')
  })

  it('includes indexed previous-result block when only previous result is provided', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Make the background warmer',
      references: [{ type: 'previous-result' }],
    })

    expect(out).toContain('REFERENCE IMAGES (in upload order):')
    expect(out).toContain('Reference 1 — PREVIOUS RESULT')
    expect(out).toContain('Apply requested edits')
    expect(out).not.toContain('Reference 2 — PRODUCT PHOTO')
  })

  it('includes indexed mixed block when previous result and photos are provided', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Combine products into the scene',
      references: [{ type: 'previous-result' }, { type: 'photo' }, { type: 'photo' }],
    })

    expect(out).toContain('Reference 1 — PREVIOUS RESULT')
    expect(out).toContain('Reference 2 — PRODUCT PHOTO')
    expect(out).toContain('Reference 3 — PRODUCT PHOTO')
  })

  it('omits reference block when references is empty', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Hero dish on marble',
      references: [],
    })

    expect(out).not.toContain('REFERENCE IMAGES (in upload order):')
  })

  it('places foundation sections before creative direction', () => {
    const out = buildInstagramPostPrompt({ userPrompt: 'My creative brief' })

    const outputIndex = out.indexOf('OUTPUT:')
    const compositionIndex = out.indexOf('COMPOSITION (NON-NEGOTIABLE):')
    const photographyIndex = out.indexOf('PHOTOGRAPHY & LIGHTING')
    const creativeIndex = out.indexOf('CREATIVE DIRECTION')

    expect(outputIndex).toBeGreaterThanOrEqual(0)
    expect(compositionIndex).toBeGreaterThan(outputIndex)
    expect(photographyIndex).toBeGreaterThan(compositionIndex)
    expect(creativeIndex).toBeGreaterThan(photographyIndex)
  })

  it('includes full photography block for new scene generations', () => {
    const out = buildInstagramPostPrompt({ userPrompt: 'Hero dish on marble' })

    expect(out).toContain('PHOTOGRAPHY & LIGHTING')
    expect(out).toContain('Warm directional window light')
    expect(out).toContain('45–60° hero angle')
    expect(out).toContain('soft background bokeh')
    expect(out).toContain('no plastic or waxy food')
    expect(out).not.toContain("Preserve the reference image's composition")
  })

  it('includes lighter photography block when previous result is included', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Make the background warmer',
      references: [{ type: 'previous-result' }, { type: 'photo' }],
    })

    expect(out).toContain('PHOTOGRAPHY & LIGHTING')
    expect(out).toContain("Preserve the reference image's composition, camera angle, and lighting")
    expect(out).toContain('Apply only the edits described in creative direction')
    expect(out).not.toContain('45–60° hero angle')
  })
})
