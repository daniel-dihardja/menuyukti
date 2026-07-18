import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { normalizeToLeonardoCanvas } from '@/lib/leonardo'

describe('normalizeToLeonardoCanvas', () => {
  it('outputs exact width×height without stretching (cover crop)', async () => {
    // Wide source (2:1) → tall canvas (4:5) must crop, not stretch.
    const source = await sharp({
      create: { width: 200, height: 100, channels: 3, background: '#00ff00' },
    })
      .png()
      .toBuffer()

    const out = await normalizeToLeonardoCanvas(source, 1080, 1350)
    const meta = await sharp(out).metadata()
    expect(meta.width).toBe(1080)
    expect(meta.height).toBe(1350)
    expect(meta.format).toBe('webp')
  })

  it('preserves aspect of already-correct canvases', async () => {
    const source = await sharp({
      create: { width: 1080, height: 1350, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer()

    const out = await normalizeToLeonardoCanvas(source, 1080, 1350)
    const meta = await sharp(out).metadata()
    expect(meta.width).toBe(1080)
    expect(meta.height).toBe(1350)
  })
})
