import { describe, expect, it } from 'vitest'

import {
  INSTAGRAM_GRID_THUMBNAIL_INSET_X_PERCENT,
  INSTAGRAM_GRID_THUMBNAIL_INSET_Y_PERCENT,
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'
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

  it('includes solid background canvas reference line in fresh scene', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Flat lay with coffee',
      mode: 'fresh-scene',
      references: [{ type: 'background-color', color: '#ffffff' }, { type: 'photo' }],
    })

    expect(out).toContain('REFERENCE IMAGES (in upload order):')
    expect(out).toContain('Reference 1 — BACKGROUND CANVAS: a flat solid field in #ffffff')
    expect(out).toContain('This is not a layout template')
    expect(out).toContain('Reference 2 — PRODUCT PHOTO')
    expect(out).not.toContain('SLOT')
  })

  it('keeps solid background in fresh-scene mode via detectPromptMode', () => {
    expect(
      detectPromptMode([{ type: 'background-color', color: '#ffffff' }, { type: 'photo' }]),
    ).toBe('fresh-scene')
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

  it('uses a style/headline prompt when only a template is provided', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Headline: Weekend specials',
      mode: 'template-composite',
      references: [{ type: 'template' }],
    })

    expect(out).toContain('editing a fixed Instagram post TEMPLATE for style and copy updates')
    expect(out).toContain('master layout and visual style guide')
    expect(out).toContain('Reference 1 — TEMPLATE')
    expect(out).toContain('CREATIVE DIRECTION (headline, labels, style notes):')
    expect(out).not.toContain('SLOT FILL — IN-PAINT, NOT OVERLAY')
    expect(out).not.toContain('PRODUCT FIDELITY')
    expect(out.endsWith('Headline: Weekend specials')).toBe(true)
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

  it('preserves previous-result dimensions in filled-edit output instructions', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Warm the background slightly',
      mode: 'filled-edit',
      references: [{ type: 'previous-result' }],
      outputDimensions: { width: 1080, height: 1080 },
    })

    expect(out).toContain(
      'Match the FILLED RESULT reference dimensions exactly: 1080×1080 pixels (aspect ratio 1:1)',
    )
    expect(out).toContain('Do not crop, stretch, letterbox, or change the canvas size')
    expect(out).not.toContain('1080×1350')
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

  it('injects STYLE PACK block and style reference before creative direction', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'Pad thai bowl lunch offer',
      mode: 'fresh-scene',
      references: [{ type: 'style' }, { type: 'photo' }],
      style: {
        name: 'Warm editorial',
        rules: 'Warm window light; soft shadows; no neon.',
      },
    })

    expect(out).toContain('STYLE PACK — "Warm editorial":')
    expect(out).toContain('Warm window light; soft shadows; no neon.')
    expect(out).toContain('Reference 1 — STYLE REFERENCE')
    expect(out).toContain('Do NOT copy its subject')
    expect(out).toContain('Reference 2 — PRODUCT PHOTO')
    expect(out.indexOf('STYLE PACK')).toBeLessThan(out.indexOf('CREATIVE DIRECTION'))
    expect(out.endsWith('Pad thai bowl lunch offer')).toBe(true)
  })

  it('compiles Style Spec controls and strips bracket overrides from creative direction', () => {
    const out = buildInstagramPostPrompt({
      userPrompt: 'cold brew [headline=none]',
      mode: 'fresh-scene',
      style: {
        name: 'Warm Oat',
        rules: 'fallback rules',
        styleSpec: {
          schemaVersion: 1,
          kind: 'template',
          baseRules: ['Cream background; mustard accents.'],
          controls: {
            headline: {
              type: 'enum',
              values: ['auto', 'none'],
              default: 'auto',
              instructions: {
                auto: 'Place a headline when provided.',
                none: 'Leave the headline area empty.',
              },
            },
            productName: {
              type: 'enum',
              values: ['auto', 'none'],
              default: 'auto',
              instructions: {
                auto: 'Place product name when provided.',
                none: 'Omit product name.',
              },
            },
            backgroundIllustration: {
              type: 'enum',
              values: ['template_default', 'none'],
              default: 'template_default',
              instructions: {
                template_default: 'Keep template line art.',
                none: 'No background illustrations.',
              },
            },
          },
          defaults: {
            headline: 'auto',
            productName: 'auto',
            backgroundIllustration: 'template_default',
          },
        },
      },
    })

    expect(out).toContain('Cream background; mustard accents.')
    expect(out).toContain('CONTROLS (resolved):')
    expect(out).toContain('headline: none → Leave the headline area empty.')
    expect(out).not.toContain('[headline=none]')
    expect(out.endsWith('cold brew')).toBe(true)
    expect(out).not.toContain('fallback rules')
  })
})

describe('detectPromptMode', () => {
  it('detects template-composite when template and products are present', () => {
    expect(detectPromptMode([{ type: 'template' }, { type: 'photo' }, { type: 'photo' }])).toBe(
      'template-composite',
    )
  })

  it('detects template-composite when only a template is present', () => {
    expect(detectPromptMode([{ type: 'template' }])).toBe('template-composite')
  })

  it('detects filled-edit when only previous result is present', () => {
    expect(detectPromptMode([{ type: 'previous-result' }])).toBe('filled-edit')
  })

  it('detects fresh-scene otherwise', () => {
    expect(detectPromptMode([{ type: 'photo' }])).toBe('fresh-scene')
    expect(detectPromptMode([])).toBe('fresh-scene')
  })
})
