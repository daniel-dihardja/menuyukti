import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { createSolidBackgroundBuffer } from '@/lib/posts/create-solid-background-buffer'

describe('createSolidBackgroundBuffer', () => {
  it('creates a non-empty WebP at the requested dimensions', async () => {
    const buffer = await createSolidBackgroundBuffer(64, 80, '#ff0000')
    expect(buffer.byteLength).toBeGreaterThan(0)

    const metadata = await sharp(buffer).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(64)
    expect(metadata.height).toBe(80)
  })

  it('normalizes invalid colors to the default white canvas', async () => {
    const buffer = await createSolidBackgroundBuffer(32, 32, 'not-a-color')
    const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(32)
    expect(info.height).toBe(32)
    // First pixel RGB should be white after default normalization.
    expect(data[0]).toBe(255)
    expect(data[1]).toBe(255)
    expect(data[2]).toBe(255)
  })
})
