import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

import {
  getPresignedGetUrl,
  getS3Bucket,
  getS3Client,
  isObjectKeyForUser,
  isSafeAssetFilename,
  userPrefix,
} from '@/lib/assets/storage'

export async function GET() {
  const authz = await requireMenuyuktiAdminApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const bucket = getS3Bucket()
  const s3 = getS3Client()
  const prefix = userPrefix(userId)

  type Row = { name: string; url: string; size: number; createdAt: string }

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
        if (!isObjectKeyForUser(key, userId)) continue
        const name = key.slice(prefix.length)
        if (!isSafeAssetFilename(name)) continue

        const url = await getPresignedGetUrl(key)
        rows.push({
          name,
          url,
          size: obj.Size ?? 0,
          createdAt: obj.LastModified.toISOString(),
        })
      }

      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
    } while (continuationToken)
  } catch (err) {
    console.error('[assets/list] S3 list failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Failed to list assets' }, { status: 502 })
  }

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json({ items: rows })
}
