import sharp from 'sharp'

import { normalizeSolidBackgroundColor } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'

/**
 * Synthesize a solid-color WebP canvas at the given pixel size for generation reference.
 */
export async function createSolidBackgroundBuffer(
  width: number,
  height: number,
  color: string,
): Promise<Buffer> {
  const background = normalizeSolidBackgroundColor(color)
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background,
    },
  })
    .webp({ quality: 85 })
    .toBuffer()
}
