import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import {
  getS3Bucket,
  getS3Client,
  isSafePhotoFilename,
  userPhotosObjectKey,
} from '@/lib/assets/storage'

const bodySchema = z.object({
  name: z.string().min(1),
})

export async function DELETE(req: Request) {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid body' }, { status: 400 })
  }

  const { name } = parsed.data
  if (!isSafePhotoFilename(name)) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 })
  }

  const key = userPhotosObjectKey(userId, name)
  const s3 = getS3Client()
  const bucket = getS3Bucket()

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )
  } catch (err) {
    console.error('[media/delete] S3 DeleteObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Delete failed' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
