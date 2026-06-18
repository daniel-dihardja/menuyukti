import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import {
  getPresignedGetUrl,
  getReelMediaType,
  getS3Bucket,
  getS3Client,
  isObjectKeyForReel,
  isSafeReelFilename,
  userReelsPrefix,
} from '@/lib/assets/storage'

export async function GET() {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const bucket = getS3Bucket()
  const s3 = getS3Client()
  const prefix = userReelsPrefix(userId)

  type Row = {
    name: string
    url: string
    size: number
    createdAt: string
    mediaType: 'image' | 'video'
  }

  const rows: Row[] = []
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
        if (!key || !obj.LastModified) continue
        if (!isObjectKeyForReel(key, userId)) continue
        const name = key.slice(prefix.length)
        if (!isSafeReelFilename(name)) continue
        const mediaType = getReelMediaType(name)
        if (!mediaType) continue

        const url = await getPresignedGetUrl(key)
        rows.push({
          name,
          url,
          size: obj.Size ?? 0,
          createdAt: obj.LastModified.toISOString(),
          mediaType,
        })
      }

      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
    } while (continuationToken)
  } catch (err) {
    console.error('[reels/list] S3 list failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Failed to list reels' }, { status: 502 })
  }

  const sortedRows = rows.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json(
    { items: sortedRows },
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    },
  )
}
