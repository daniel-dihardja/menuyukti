import type { ShopProduct } from '@/components/shop/shop-catalog'

import type { ShopS3Image } from './s3-shop-images'

export type ResolvedShopImage = {
  src: string
  alt: string
  label: string
}

function humanizeFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  return base.trim() || 'Image'
}

/**
 * Pairs presigned S3 gallery URLs with catalog alt/label hints by index.
 */
export function resolveShopImages(
  product: ShopProduct,
  s3Images: ShopS3Image[],
): ResolvedShopImage[] {
  if (s3Images.length === 0) {
    return []
  }

  const hints = product.imageHints
  return s3Images.map((img, i) => {
    const hint = hints[i]
    const alt = hint?.alt ?? `${product.title} — ${humanizeFilename(img.filename)}`
    const label = hint?.label ?? `Image ${i + 1}`
    return { src: img.url, alt, label }
  })
}
