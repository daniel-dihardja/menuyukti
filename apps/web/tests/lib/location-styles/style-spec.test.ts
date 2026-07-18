import { describe, expect, it } from 'vitest'

import {
  compileStyleSpec,
  parseStyleControlOverrides,
  parseStyleSpec,
  rulesFromStyleSpec,
  type StyleSpec,
} from '@/lib/location-styles/style-spec'

const WARM_OAT: StyleSpec = {
  schemaVersion: 1,
  kind: 'template',
  baseRules: [
    'Cream background; black line art; mustard accents only.',
    'Only the product in the cup may be photorealistic.',
  ],
  controls: {
    headline: {
      type: 'enum',
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
  },
  defaults: {
    headline: 'auto',
    productName: 'auto',
    backgroundIllustration: 'template_default',
  },
}

describe('style-spec', () => {
  it('parses a valid Style Spec', () => {
    expect(parseStyleSpec(WARM_OAT)).toEqual(WARM_OAT)
  })

  it('accepts null optional fields and list-shaped instructions from agents', () => {
    const agentish = {
      schemaVersion: '1',
      kind: 'template',
      baseRules: ['Cream background.', '', 'Black line art.'],
      controls: {
        headline: {
          values: ['auto', 'none'],
          default: 'auto',
          description: null,
          params: null,
          instructions: [
            { value: 'auto', instruction: 'Place headline when provided.' },
            { value: 'none', instruction: 'Omit headline.' },
          ],
        },
        productName: {
          type: 'enum',
          values: ['auto', 'none'],
          default: 'weird',
          instructions: { auto: 'Place name.', none: 'Omit name.' },
        },
        backgroundIllustration: {
          type: 'enum',
          values: ['template_default', 'none'],
          default: 'template_default',
          instructions: {
            template_default: 'Keep decorations.',
            // missing none — normalizer fills it
          },
        },
      },
      defaults: {
        headline: 'auto',
        productName: 'auto',
        backgroundIllustration: 'template_default',
      },
    }
    const parsed = parseStyleSpec(agentish)
    expect(parsed).not.toBeNull()
    expect(parsed!.schemaVersion).toBe(1)
    expect(parsed!.baseRules).toEqual(['Cream background.', 'Black line art.'])
    expect(parsed!.controls.headline.instructions.none).toBe('Omit headline.')
    expect(parsed!.controls.productName.default).toBe('auto')
    expect(parsed!.controls.backgroundIllustration.instructions.none).toContain(
      'Apply control mode none',
    )
  })

  it('rejects unknown control inventing via missing fixed keys', () => {
    expect(
      parseStyleSpec({ ...WARM_OAT, controls: { headline: WARM_OAT.controls.headline } }),
    ).toBeNull()
  })

  it('parses bracket overrides and strips them from the prompt', () => {
    const { overrides, cleanedPrompt } = parseStyleControlOverrides(
      'cold brew [headline=none] name Cold Brew [productName=custom text="COLD BREW"]',
    )
    expect(overrides.headline).toEqual({ value: 'none' })
    expect(overrides.productName).toEqual({ value: 'custom', text: 'COLD BREW' })
    expect(cleanedPrompt).toBe('cold brew name Cold Brew')
  })

  it('compiles defaults and applies overrides with template fill', () => {
    const { body } = compileStyleSpec(WARM_OAT, {
      headline: { value: 'none' },
      productName: { value: 'custom', text: 'COLD BREW' },
    })
    expect(body).toContain('Cream background')
    expect(body).toContain('CONTROLS (resolved):')
    expect(body).toContain('headline: none → Leave the top-left headline area empty.')
    expect(body).toContain(
      'productName: custom → Place this exact product name under the cup: COLD BREW.',
    )
    expect(body).toContain('backgroundIllustration: template_default')
  })

  it('syncs rulesFromBase from baseRules', () => {
    expect(rulesFromStyleSpec(WARM_OAT)).toBe(
      'Cream background; black line art; mustard accents only.\nOnly the product in the cup may be photorealistic.',
    )
  })
})
