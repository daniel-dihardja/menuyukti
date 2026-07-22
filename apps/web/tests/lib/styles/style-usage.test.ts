import { describe, expect, it } from 'vitest'

import type { StyleSpec } from '@/lib/styles/style-spec'
import { buildStyleUsageGuide } from '@/lib/styles/style-usage'

const GUIDE_SPEC: StyleSpec = {
  schemaVersion: 2,
  properties: {
    headline: {
      type: 'enum',
      label: 'Headline',
      description: 'Top-left title slot.',
      values: ['auto', 'custom', 'none'],
      default: 'auto',
      params: {
        text: { type: 'string', requiredWhen: 'custom' },
      },
      instructions: {
        none: 'Leave the top-left headline area empty.',
        auto: 'If a title is provided, place a short uppercase headline top-left.',
        custom: 'Render this exact headline top-left: {{text}}.',
      },
    },
    includeLogo: {
      type: 'boolean',
      label: 'Logo',
      default: false,
      instructions: {
        true: 'Place a small venue logo bottom-right.',
        false: 'No logo anywhere in the image.',
      },
    },
    maxHeadlineWords: {
      type: 'number',
      default: 4,
      min: 0,
      max: 12,
      instruction: 'Headline must be at most {{value}} words.',
    },
    layoutNotes: {
      type: 'text',
      default: '',
      instruction: 'Layout constraint: {{value}}.',
    },
    backgroundIllustration: {
      type: 'enum',
      values: ['template_default', 'minimal', 'none'],
      default: 'template_default',
      instructions: {
        template_default: 'Keep template line art.',
        minimal: 'Few small marks only.',
        none: 'No background illustrations.',
      },
    },
  },
}

describe('buildStyleUsageGuide', () => {
  it('builds labels, summaries, and example tags from the Spec', () => {
    const guide = buildStyleUsageGuide(GUIDE_SPEC)

    expect(guide.properties).toHaveLength(5)

    const headline = guide.properties.find((property) => property.key === 'headline')
    expect(headline).toMatchObject({
      label: 'Headline',
      description: 'Top-left title slot.',
      type: 'enum',
      summary: 'auto | custom | none',
      exampleTag: '[headline=custom text="…"]',
    })

    const bg = guide.properties.find((property) => property.key === 'backgroundIllustration')
    expect(bg).toMatchObject({
      label: 'backgroundIllustration',
      type: 'enum',
      exampleTag: '[backgroundIllustration=template_default]',
    })
    expect(bg?.description).toBeUndefined()

    const logo = guide.properties.find((property) => property.key === 'includeLogo')
    expect(logo?.exampleTag).toBe('[includeLogo=false]')
    expect(logo?.summary).toContain('default false')

    const words = guide.properties.find((property) => property.key === 'maxHeadlineWords')
    expect(words?.exampleTag).toBe('[maxHeadlineWords=4]')
    expect(words?.summary).toContain('min 0')
    expect(words?.summary).toContain('max 12')

    const notes = guide.properties.find((property) => property.key === 'layoutNotes')
    expect(notes?.exampleTag).toBe('[layoutNotes=notes]')
  })

  it('joins example tags into a pasteable brief', () => {
    const guide = buildStyleUsageGuide(GUIDE_SPEC)
    expect(guide.exampleBrief).toContain('[headline=custom text="…"]')
    expect(guide.exampleBrief).toContain('[includeLogo=false]')
    expect(guide.exampleBrief.split('\n')).toHaveLength(guide.properties.length)
  })
})
