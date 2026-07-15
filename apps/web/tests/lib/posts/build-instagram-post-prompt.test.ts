import { describe, expect, it } from 'vitest'

import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import { buildInstagramPostPrompt, detectPromptMode } from '@/lib/posts/build-instagram-post-prompt'

describe('buildInstagramPostPrompt', () => {
  it('places trimmed user prompt under CREATIVE DIRECTION for fresh scene', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: '  Warm kopitiam scene with kaya toast  ',
      mode: 'fresh-scene',
    })

    expect(out).toContain("CREATIVE DIRECTION (follow the user's vision):")
    expect(out.endsWith('Warm kopitiam scene with kaya toast')).toBe(true)
  })

  it('includes composition frame percentages derived from constants in fresh scene', () => {
    const out = buildInstagramPostPrompt({ userPrompt: 'Test scene', mode: 'fresh-scene' })

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

  it('includes indexed photo reference block when only photos are provided in fresh scene', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Hero dish on marble',
      mode: 'fresh-scene',
      references: [{ type: 'photo' }, { type: 'photo' }],
    })

    expect(out).toContain('REFERENCE IMAGES (in upload order):')
    expect(out).toContain('Reference 1 — PRODUCT PHOTO')
    expect(out).toContain('Reference 2 — PRODUCT PHOTO')
    expect(out).toContain('Preserve product identity')
  })

  it('includes template composite task and product fidelity blocks', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Ref 3 → center hero bowl',
      mode: 'template-composite',
      references: [{ type: 'template' }, { type: 'photo' }, { type: 'photo' }, { type: 'photo' }],
    })

    expect(out).toContain('Match the TEMPLATE reference dimensions exactly: 1080×1350 pixels')
    expect(out).toContain('compositing real product photos into a fixed Instagram post TEMPLATE')
    expect(out).toContain('SLOT FILL — IN-PAINT, NOT OVERLAY')
    expect(out).toContain('FORBIDDEN:')
    expect(out).toContain('TEXT FROM CREATIVE DIRECTION')
    expect(out).toContain('PRODUCT IMAGE HERE')
    expect(out).toContain('Reference 1 — TEMPLATE')
    expect(out).toContain('Reference 2 — PRODUCT (Slot A)')
    expect(out).toContain('Reference 3 — PRODUCT (Slot B)')
    expect(out).toContain('Reference 4 — PRODUCT (Slot C)')
    expect(out).toContain('PRODUCT FIDELITY (NON-NEGOTIABLE)')
    expect(out).toContain('Do NOT stretch, squash, warp, morph')
    expect(out).toContain('PRESERVE / REPLACE / REMOVE')
    expect(out).toContain('COMPLETION CHECKLIST')
    expect(out).toContain('Creative direction may override which product fills which placeholder')
    expect(out).toContain('CREATIVE DIRECTION (headline, product names, slot mapping')
    expect(out.endsWith('Ref 3 → center hero bowl')).toBe(true)
  })

  it('uses template output dimensions in template-composite mode when provided', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Headline: Weekend specials',
      mode: 'template-composite',
      references: [{ type: 'template' }, { type: 'photo' }],
      outputDimensions: { width: 1248, height: 1664 },
    })

    expect(out).toContain('Match the TEMPLATE reference dimensions exactly: 1248×1664 pixels')
    expect(out).toContain('aspect ratio 3:4')
    expect(out).not.toContain('1080×1350')
  })

  it('includes filled edit block for filled-edit mode', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Warm the background slightly',
      mode: 'filled-edit',
      references: [{ type: 'previous-result' }],
    })

    expect(out).toContain('You are editing a photorealistic Instagram portrait post image')
    expect(out).toContain('Reference 1 — FILLED RESULT')
    expect(out).toContain("Preserve the reference image's composition, camera angle, and lighting")
    expect(out).toContain('CREATIVE DIRECTION (apply only the requested edits):')
    expect(out).not.toContain('TEMPLATE')
    expect(out).not.toContain('PRODUCT FIDELITY')
  })

  it('omits reference block when references is empty', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Hero dish on marble',
      mode: 'fresh-scene',
      references: [],
    })

    expect(out).not.toContain('REFERENCE IMAGES (in upload order):')
  })

  it('places foundation sections before creative direction in template composite', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'My creative brief',
      mode: 'template-composite',
      references: [{ type: 'template' }, { type: 'photo' }],
    })

    const taskIndex = out.indexOf('TASK:')
    const slotFillIndex = out.indexOf('SLOT FILL')
    const productFidelityIndex = out.indexOf('PRODUCT FIDELITY')
    const creativeIndex = out.indexOf('CREATIVE DIRECTION')

    expect(taskIndex).toBeGreaterThanOrEqual(0)
    expect(slotFillIndex).toBeGreaterThan(taskIndex)
    expect(productFidelityIndex).toBeGreaterThan(slotFillIndex)
    expect(creativeIndex).toBeGreaterThan(productFidelityIndex)
  })

  it('includes full photography block for new scene generations', () => {
    const out = buildInstagramPostPrompt({ userPrompt: 'Hero dish on marble', mode: 'fresh-scene' })

    expect(out).toContain('PHOTOGRAPHY & LIGHTING')
    expect(out).toContain('Warm directional window light')
    expect(out).toContain('45–60° hero angle')
    expect(out).toContain('soft background bokeh')
    expect(out).not.toContain("Preserve the reference image's composition")
  })

  it('includes lighter photography block when previous result is included in fresh scene', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Make the background warmer',
      mode: 'fresh-scene',
      references: [{ type: 'previous-result' }, { type: 'photo' }],
    })

    expect(out).toContain('PHOTOGRAPHY & LIGHTING')
    expect(out).toContain("Preserve the reference image's composition, camera angle, and lighting")
    expect(out).not.toContain('45–60° hero angle')
  })
})

describe('detectPromptMode', () => {
  it('detects template-composite when template and products are present', () => {
    expect(detectPromptMode([{ type: 'template' }, { type: 'photo' }, { type: 'photo' }])).toBe(
      'template-composite',
    )
  })

  it('detects filled-edit when only previous result is present', () => {
    expect(detectPromptMode([{ type: 'previous-result' }])).toBe('filled-edit')
  })

  it('detects fresh-scene otherwise', () => {
    expect(detectPromptMode([{ type: 'photo' }])).toBe('fresh-scene')
    expect(detectPromptMode([])).toBe('fresh-scene')
  })
})
