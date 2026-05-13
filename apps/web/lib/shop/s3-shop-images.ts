import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

import { getPresignedGetUrl, getS3Bucket, getS3Client } from '@/lib/assets/storage'
import { getShopProductBySlug, getShopProductSlugs } from '@/components/shop/shop-catalog'

/** S3 key prefix for print shop assets (bucket is `AWS_S3_BUCKET`, default `menuyukti`). */
export const SHOP_IMAGE_PREFIX = 'menuyukti/shop'

export type ShopS3Image = {
  key: string
  url: string
  filename: string
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i

function isAllowedImageKey(key: string): boolean {
  if (key.endsWith('/')) return false
  return IMAGE_EXT.test(key)
}

export function isShopSlugAllowed(slug: string): boolean {
  return getShopProductSlugs().includes(slug)
}

export function shopPrefixForSlug(slug: string): string {
  return `${SHOP_IMAGE_PREFIX}/${slug}/`
}

function shopImagesCacheTag(slug: string): string {
  return `shop-images:${slug}`
}

/**
 * Resolves gallery image URLs for a product: explicit `s3PreviewObjectKeys` (presigned), else objects listed under `menuyukti/shop/{slug}/`.
 * Returns [] if slug is unknown, AWS is unconfigured, or S3 errors.
 */
export async function listShopImagesForSlug(slug: string): Promise<ShopS3Image[]> {
  if (!isShopSlugAllowed(slug)) {
    return []
  }

  const product = getShopProductBySlug(slug)
  const explicitKeys = product?.s3PreviewObjectKeys?.map((k) => k.trim()).filter(Boolean) ?? []

  if (explicitKeys.length > 0) {
    // Docker/CI builds often omit AWS env.
    if (!process.env.AWS_REGION?.trim()) {
      return []
    }

    const out: ShopS3Image[] = []
    for (const key of explicitKeys) {
      try {
        const url = await getPresignedGetUrl(key)
        const filename = key.includes('/') ? key.slice(key.lastIndexOf('/') + 1) : key
        out.push({ key, url, filename })
      } catch (err) {
        console.error('[shop/s3] presign preview key failed', {
          slug,
          key,
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }
    return out
  }

  if (!process.env.AWS_REGION?.trim()) {
    return []
  }

  const bucket = getS3Bucket()
  const s3 = getS3Client()
  const prefix = shopPrefixForSlug(slug)
  const keys: string[] = []
  let continuationToken: string | undefined

  try {
    do {
      const listed = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      )

      for (const obj of listed.Contents ?? []) {
        const key = obj.Key
        if (!key || !isAllowedImageKey(key)) continue
        keys.push(key)
      }

      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
    } while (continuationToken)
  } catch (err) {
    console.error('[shop/s3] list failed', {
      slug,
      message: err instanceof Error ? err.message : String(err),
    })
    return []
  }

  const sortedKeys = keys.toSorted()

  const out: ShopS3Image[] = []
  for (const key of sortedKeys) {
    const relative = key.slice(prefix.length)
    if (!relative || relative.includes('/')) continue

    const url = await getPresignedGetUrl(key)
    out.push({ key, url, filename: relative })
  }

  return out
}

/**
 * Cached S3 image listing for shop product pages.
 * Keep TTL short because URLs are presigned and time-bound.
 */
export async function getCachedShopImagesForSlug(slug: string): Promise<ShopS3Image[]> {
  'use cache'
  cacheTag(shopImagesCacheTag(slug))
  cacheLife({ revalidate: 60 })
  return listShopImagesForSlug(slug)
}

export function revalidateShopImagesForSlug(slug: string): void {
  revalidateTag(shopImagesCacheTag(slug), { expire: 0 })
}
