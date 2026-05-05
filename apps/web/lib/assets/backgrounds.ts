import { ListObjectsV2Command } from '@aws-sdk/client-s3'

import { getPresignedGetUrl, getS3Bucket, getS3Client } from '@/lib/assets/storage'

/** S3 key prefix for built-in canvas backgrounds (bucket from `AWS_S3_BUCKET`, default `menuyukti`). */
export const BACKGROUND_PREFIX = 'menuyukti/backgrounds/'

const IMAGE_EXT = /\.(jpe?g|png|webp|avif)$/i

/** Max length for a single-segment background filename (no path segments). */
export const BACKGROUND_FILENAME_MAX_LENGTH = 255

export type BackgroundItem = {
  key: string
  name: string
  url: string
  size: number
  createdAt: string
}

/**
 * Validates a flat filename under `menuyukti/backgrounds/` (no traversal, allowed image extensions).
 */
export function isSafeBackgroundFilename(name: string): boolean {
  if (!name || name.length > BACKGROUND_FILENAME_MAX_LENGTH) return false
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return false
  return IMAGE_EXT.test(name)
}

function isListedBackgroundKey(key: string): boolean {
  if (!key.startsWith(BACKGROUND_PREFIX) || key === BACKGROUND_PREFIX) return false
  if (key.endsWith('/')) return false
  const relative = key.slice(BACKGROUND_PREFIX.length)
  if (!relative || relative.includes('/')) return false
  return isSafeBackgroundFilename(relative)
}

export function backgroundObjectKey(filename: string): string {
  return `${BACKGROUND_PREFIX}${filename}`
}

/**
 * Lists image objects directly under `menuyukti/backgrounds/`, presigns GET URLs.
 * Returns [] if AWS is unconfigured or S3 errors.
 */
export async function listBuiltinBackgrounds(): Promise<BackgroundItem[]> {
  if (!process.env.AWS_REGION?.trim()) {
    return []
  }

  const bucket = getS3Bucket()
  const s3 = getS3Client()
  const rows: BackgroundItem[] = []
  let continuationToken: string | undefined

  try {
    do {
      const listed = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: BACKGROUND_PREFIX,
          ContinuationToken: continuationToken,
        }),
      )

      for (const obj of listed.Contents ?? []) {
        const key = obj.Key
        if (!key || !obj.LastModified) continue
        if (!isListedBackgroundKey(key)) continue

        const name = key.slice(BACKGROUND_PREFIX.length)
        const url = await getPresignedGetUrl(key)
        rows.push({
          key,
          name,
          url,
          size: obj.Size ?? 0,
          createdAt: obj.LastModified.toISOString(),
        })
      }

      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
    } while (continuationToken)
  } catch (err) {
    console.error('[assets/backgrounds] S3 list failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    return []
  }

  rows.sort((a, b) => a.name.localeCompare(b.name))
  return rows
}
