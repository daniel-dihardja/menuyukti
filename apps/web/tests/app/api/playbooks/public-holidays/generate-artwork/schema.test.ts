import { describe, expect, it } from 'vitest'

import { generateArtworkBodySchema } from '@/app/api/playbooks/public-holidays/generate-artwork/schema'

const baseBody = {
  prompt: 'A cozy restaurant story for Independence Day',
  styleImageName: 'style-ref.webp',
}

describe('generateArtworkBodySchema', () => {
  it('accepts a first-generation body without revise fields', () => {
    const parsed = generateArtworkBodySchema.safeParse(baseBody)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.previousImageName).toBeUndefined()
      expect(parsed.data.feedback).toBeUndefined()
    }
  })

  it('accepts a refine body with previousImageName and feedback', () => {
    const parsed = generateArtworkBodySchema.safeParse({
      ...baseBody,
      previousImageName: 'abc123.webp',
      feedback: 'warmer light; less clutter',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.previousImageName).toBe('abc123.webp')
      expect(parsed.data.feedback).toBe('warmer light; less clutter')
    }
  })

  it('rejects previousImageName without feedback', () => {
    const parsed = generateArtworkBodySchema.safeParse({
      ...baseBody,
      previousImageName: 'abc123.webp',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects feedback without previousImageName', () => {
    const parsed = generateArtworkBodySchema.safeParse({
      ...baseBody,
      feedback: 'warmer light',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects empty feedback', () => {
    const parsed = generateArtworkBodySchema.safeParse({
      ...baseBody,
      previousImageName: 'abc123.webp',
      feedback: '   ',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects feedback over 1000 characters', () => {
    const parsed = generateArtworkBodySchema.safeParse({
      ...baseBody,
      previousImageName: 'abc123.webp',
      feedback: 'x'.repeat(1001),
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects empty prompt', () => {
    const parsed = generateArtworkBodySchema.safeParse({
      ...baseBody,
      prompt: '',
    })
    expect(parsed.success).toBe(false)
  })
})
