import { describe, expect, it } from 'vitest'

import { createStyleBodySchema, updateStyleBodySchema } from '@/app/api/styles/schema'

const validSpec = {
  schemaVersion: 2 as const,
  properties: {
    headline: {
      type: 'enum' as const,
      values: ['auto', 'none'],
      default: 'auto',
      instructions: {
        auto: 'Place a headline.',
        none: 'No headline.',
      },
    },
  },
}

describe('style API schemas', () => {
  it('accepts createStyle with spec and reference image', () => {
    const parsed = createStyleBodySchema.parse({
      name: 'Warm',
      referenceImageName: 'abc.webp',
      spec: validSpec,
      isDefault: true,
    })
    expect(parsed.spec.schemaVersion).toBe(2)
    expect(parsed.referenceImageName).toBe('abc.webp')
  })

  it('rejects createStyle without spec', () => {
    expect(() =>
      createStyleBodySchema.parse({
        name: 'Warm',
        referenceImageName: 'abc.webp',
      }),
    ).toThrow()
  })

  it('rejects createStyle with empty properties', () => {
    expect(() =>
      createStyleBodySchema.parse({
        name: 'Bad',
        referenceImageName: 'abc.webp',
        spec: { schemaVersion: 2, properties: {} },
      }),
    ).toThrow()
  })

  it('requires at least one field on updateStyle', () => {
    expect(() => updateStyleBodySchema.parse({})).toThrow()
    expect(updateStyleBodySchema.parse({ spec: validSpec }).spec?.schemaVersion).toBe(2)
  })
})
