import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { prepareUploadImage } from '@/lib/assets/prepare-upload-image'
import { getPresignedGetUrl, getS3Bucket, getS3Client } from '@/lib/assets/storage'
import { requireWorkspaceMediaAccess, writeObjectKey } from '@/lib/assets/workspace-media-access'

export const maxDuration = 120

const MAX_VIDEO_BYTES = 52_428_800

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
])

const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

const VIDEO_EXT_BY_MIME: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export async function POST(req: Request) {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

  const mediaAccess = await requireWorkspaceMediaAccess(userId, 'write')
  if (!mediaAccess.ok) return mediaAccess.response

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ message: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
  }

  const mime = file.type.toLowerCase()
  const isImage = ALLOWED_IMAGE_TYPES.has(mime)
  const isVideo = ALLOWED_VIDEO_TYPES.has(mime)

  if (!isImage && !isVideo) {
    return NextResponse.json({ message: 'Invalid file type' }, { status: 400 })
  }

  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ message: 'Video exceeds 50 MB limit' }, { status: 413 })
  }

  const s3 = getS3Client()
  const bucket = getS3Bucket()
  const id = randomUUID()
  const createdAt = new Date().toISOString()

  if (isImage) {
    const buffer = Buffer.from(await file.arrayBuffer())
    let webpBuffer: Buffer
    try {
      const prepared = await prepareUploadImage(buffer)
      webpBuffer = prepared.webpBuffer
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read image dimensions'
      if (message === 'Could not read image dimensions') {
        return NextResponse.json({ message }, { status: 400 })
      }
      console.error('[igstories/upload] image preprocessing failed', {
        userIdPrefix: userId.slice(0, 8),
        message,
      })
      return NextResponse.json({ message: 'Failed to process image' }, { status: 500 })
    }

    const filename = `${id}.webp`
    const key = writeObjectKey(mediaAccess.access, 'igstories', filename)

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: webpBuffer,
          ContentType: 'image/webp',
        }),
      )
    } catch (err) {
      console.error('[igstories/upload] S3 PutObject failed', {
        userIdPrefix: userId.slice(0, 8),
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ message: 'Storage upload failed' }, { status: 502 })
    }

    const url = await getPresignedGetUrl(key)
    return NextResponse.json({
      url,
      name: filename,
      size: webpBuffer.byteLength,
      createdAt,
      mediaType: 'image' as const,
    })
  }

  const ext = VIDEO_EXT_BY_MIME[mime]
  const filename = `${id}.${ext}`
  const key = writeObjectKey(mediaAccess.access, 'igstories', filename)
  const videoBuffer = Buffer.from(await file.arrayBuffer())

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: videoBuffer,
        ContentType: mime,
      }),
    )
  } catch (err) {
    console.error('[igstories/upload] S3 PutObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Storage upload failed' }, { status: 502 })
  }

  const url = await getPresignedGetUrl(key)
  return NextResponse.json({
    url,
    name: filename,
    size: videoBuffer.byteLength,
    createdAt,
    mediaType: 'video' as const,
  })
}
