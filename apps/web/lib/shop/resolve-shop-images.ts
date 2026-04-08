import type { ShopProduct } from '@/components/shop/shop-catalog'

import type { ShopS3Image } from './s3-shop-images'

export type ResolvedShopImage = {
  src: string
  alt: string
  label: string
}

const PLACEHOLDER_WIDTH = 1200
const PLACEHOLDER_HEIGHT = 800

function humanizeFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  return base.trim() || 'Image'
}

/** Deterministic picsum URLs when S3 has no assets yet (`picsum.photos` is in `next.config` remotePatterns). */
function placeholderSrcForProductImage(slug: string, index: number): string {
  const seed = `${slug}-${index}`.replace(/[^a-zA-Z0-9-]/g, '-')
  return `https://picsum.photos/seed/${seed}/${PLACEHOLDER_WIDTH}/${PLACEHOLDER_HEIGHT}`
}

/**
 * Pairs S3 objects (sorted) with catalog alt/label hints by index.
 * When S3 returns nothing, uses placeholder images aligned with `imageHints` until real assets are uploaded.
 */
export function resolveShopImages(
  product: ShopProduct,
  s3Images: ShopS3Image[],
): ResolvedShopImage[] {
  if (s3Images.length > 0) {
    const hints = product.imageHints
    return s3Images.map((img, i) => {
      const hint = hints[i]
      const alt = hint?.alt ?? `${product.title} — ${humanizeFilename(img.filename)}`
      const label = hint?.label ?? `Image ${i + 1}`
      return { src: img.url, alt, label }
    })
  }

  if (product.imageHints.length === 0) {
    return []
  }

  return product.imageHints.map((hint, i) => ({
    src: placeholderSrcForProductImage(product.slug, i),
    alt: hint.alt,
    label: hint.label,
  }))
}
