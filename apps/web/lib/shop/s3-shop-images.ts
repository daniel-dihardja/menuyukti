import { ListObjectsV2Command } from '@aws-sdk/client-s3'

import { getPresignedGetUrl, getS3Bucket, getS3Client } from '@/lib/assets/storage'
import { getShopProductSlugs } from '@/components/shop/shop-catalog'

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

/**
 * Lists image objects under `menuyukti/shop/{slug}/`, presigned GET URLs.
 * Returns [] if slug is not a known product or on S3 errors.
 */
export async function listShopImagesForSlug(slug: string): Promise<ShopS3Image[]> {
  if (!isShopSlugAllowed(slug)) {
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

  keys.sort()

  const out: ShopS3Image[] = []
  for (const key of keys) {
    const relative = key.slice(prefix.length)
    if (!relative || relative.includes('/')) continue

    const url = await getPresignedGetUrl(key)
    out.push({ key, url, filename: relative })
  }

  return out
}
