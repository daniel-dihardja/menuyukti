import { describe, expect, it } from 'vitest'

import {
  compileStyleSpec,
  migrateStyleSpecV1ToV2,
  parsePropertyOverrides,
  parseStyleSpec,
  rulesFromStyleSpec,
  type StyleSpec,
  type StyleSpecV1,
} from '@/lib/styles/style-spec'

const WARM_OAT_V2: StyleSpec = {
  schemaVersion: 2,
  properties: {
    headline: {
      type: 'enum',
      label: 'Headline',
      values: ['auto', 'custom', 'none'],
      default: 'auto',
      instructions: {
        none: 'Leave the top-left headline area empty.',
        auto: 'If a title is provided, place a short uppercase headline top-left.',
        custom: 'Render this exact headline top-left: {{text}}.',
      },
    },
    productName: {
      type: 'enum',
      values: ['auto', 'custom', 'none'],
      default: 'auto',
      instructions: {
        none: 'Omit product name under the cup.',
        auto: 'If a product name is provided, place it under the cup.',
        custom: 'Place this exact product name under the cup: {{text}}.',
      },
    },
    backgroundIllustration: {
      type: 'enum',
      values: ['template_default', 'minimal', 'none', 'custom'],
      default: 'template_default',
      instructions: {
        template_default: 'Keep template sun, clouds, and plants as black line art.',
        minimal: 'Few small black line marks only.',
        none: 'No background illustrations.',
        custom: 'Follow: {{notes}}.',
      },
    },
    includeLogo: {
      type: 'boolean',
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
  },
}

const WARM_OAT_V1: StyleSpecV1 = {
  schemaVersion: 1,
  kind: 'template',
  baseRules: [
    'Cream background; black line art; mustard accents only.',
    'Only the product in the cup may be photorealistic.',
  ],
  controls: {
    headline: WARM_OAT_V2.properties.headline as StyleSpecV1['controls'][string],
    productName: WARM_OAT_V2.properties.productName as StyleSpecV1['controls'][string],
    backgroundIllustration: WARM_OAT_V2.properties
      .backgroundIllustration as StyleSpecV1['controls'][string],
  },
  defaults: {
    headline: 'auto',
    productName: 'auto',
    backgroundIllustration: 'template_default',
  },
}

describe('style-spec v2', () => {
  it('parses a valid Style Spec v2', () => {
    expect(parseStyleSpec(WARM_OAT_V2)).toEqual(WARM_OAT_V2)
  })

  it('strips legacy kind and baseRules from v2 input', () => {
    const parsed = parseStyleSpec({
      ...WARM_OAT_V2,
      kind: 'template',
      baseRules: ['legacy rule'],
    })
    expect(parsed).toEqual(WARM_OAT_V2)
    expect(parsed).not.toHaveProperty('kind')
    expect(parsed).not.toHaveProperty('baseRules')
  })

  it('migrates v1 to v2 on read', () => {
    const parsed = parseStyleSpec(WARM_OAT_V1)
    expect(parsed).not.toBeNull()
    expect(parsed!.schemaVersion).toBe(2)
    expect(parsed).not.toHaveProperty('kind')
    expect(parsed).not.toHaveProperty('baseRules')
    const headline = parsed!.properties.headline
    expect(headline?.type).toBe('enum')
    if (headline?.type === 'enum') {
      expect(headline.default).toBe('auto')
      expect(headline.values).toEqual(['auto', 'custom', 'none'])
    }
    expect(migrateStyleSpecV1ToV2(WARM_OAT_V1).properties.headline).toMatchObject({
      type: 'enum',
      default: 'auto',
      values: ['auto', 'custom', 'none'],
    })
  })

  it('rejects v2 with no properties', () => {
    expect(
      parseStyleSpec({
        schemaVersion: 2,
        properties: {},
      }),
    ).toBeNull()
  })

  it('rejects raw v1 on write-style validation without full v1 shape', () => {
    expect(parseStyleSpec({ schemaVersion: 1 })).toBeNull()
  })

  it('parses bracket overrides for dynamic property keys', () => {
    const { overrides, cleanedPrompt } = parsePropertyOverrides(
      'cold brew [headline=none] [accentColor=terracotta] [productName=custom text="COLD BREW"]',
    )
    expect(overrides.headline).toEqual({ value: 'none' })
    expect(overrides.accentColor).toEqual({ value: 'terracotta' })
    expect(overrides.productName).toEqual({
      value: 'custom',
      params: { text: 'COLD BREW' },
    })
    expect(cleanedPrompt).toBe('cold brew')
  })

  it('compiles enum defaults and applies overrides with template fill', () => {
    const { body } = compileStyleSpec(WARM_OAT_V2, {
      headline: { value: 'none' },
      productName: { value: 'custom', params: { text: 'COLD BREW' } },
    })
    expect(body).not.toContain('Cream background')
    expect(body).toContain('PROPERTIES (resolved):')
    expect(body).toContain('headline: none → Leave the top-left headline area empty.')
    expect(body).toContain(
      'productName: custom → Place this exact product name under the cup: COLD BREW.',
    )
    expect(body).toContain('backgroundIllustration: template_default')
  })

  it('compiles boolean, number, and text properties', () => {
    const { body } = compileStyleSpec(WARM_OAT_V2, {
      includeLogo: { value: 'true' },
      maxHeadlineWords: { value: '6' },
      layoutNotes: { value: 'Center the cup.' },
    })
    expect(body).toContain('includeLogo: true → Place a small venue logo bottom-right.')
    expect(body).toContain('maxHeadlineWords: 6 → Headline must be at most 6 words.')
    expect(body).toContain('layoutNotes: Center the cup. → Layout constraint: Center the cup.')
  })

  it('syncs rules from compiled property defaults', () => {
    const rules = rulesFromStyleSpec(WARM_OAT_V2)
    expect(rules).toContain('PROPERTIES (resolved):')
    expect(rules).toContain('headline: auto →')
    expect(rules).not.toContain('Cream background')
  })
})
