import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { prepareUploadImage } from '@/lib/assets/prepare-upload-image'

/** Landscape pixels tagged as portrait (common mobile camera pattern). */
async function createOrientedJpegFixture(): Promise<Buffer> {
  return sharp({
    create: {
      width: 200,
      height: 100,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()
}

describe('prepareUploadImage', () => {
  it('applies EXIF orientation before resize so portrait photos stay upright', async () => {
    const fixture = await createOrientedJpegFixture()

    const rawMeta = await sharp(fixture).metadata()
    expect(rawMeta.width).toBe(200)
    expect(rawMeta.height).toBe(100)
    expect(rawMeta.orientation).toBe(6)

    const { webpBuffer, width, height } = await prepareUploadImage(fixture)

    expect(width).toBeLessThan(height)
    expect(height).toBe(1024)
    expect(width).toBe(512)

    const outMeta = await sharp(webpBuffer).metadata()
    expect(outMeta.width).toBe(width)
    expect(outMeta.height).toBe(height)
    expect(outMeta.orientation).toBeUndefined()
  })

  it('leaves already-upright images unchanged in orientation', async () => {
    const upright = await sharp({
      create: {
        width: 100,
        height: 200,
        channels: 3,
        background: { r: 200, g: 80, b: 40 },
      },
    })
      .jpeg()
      .toBuffer()

    const { width, height } = await prepareUploadImage(upright)
    expect(width).toBeLessThan(height)
    expect(width).toBe(1024)
    expect(height).toBe(2048)
  })
})
