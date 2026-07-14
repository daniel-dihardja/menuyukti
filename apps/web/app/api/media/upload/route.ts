import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import {
  getPresignedGetUrl,
  getS3Bucket,
  getS3Client,
  photoExtensionForMime,
  userPhotosObjectKey,
} from '@/lib/assets/storage'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
])

export async function POST(req: Request) {
  const authz = await requireAuthenticatedApi()
  if (!authz.ok) return authz.response
  const { userId } = authz

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
  if (!ALLOWED_TYPES.has(mime)) {
    return NextResponse.json({ message: 'Invalid file type' }, { status: 400 })
  }

  const extension = photoExtensionForMime(mime)
  if (!extension) {
    return NextResponse.json({ message: 'Invalid file type' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const metadata = await sharp(buffer).metadata()
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ message: 'Could not read image dimensions' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read image dimensions'
    console.error('[media/upload] image validation failed', {
      userIdPrefix: userId.slice(0, 8),
      message,
    })
    return NextResponse.json({ message: 'Could not read image dimensions' }, { status: 400 })
  }

  const id = randomUUID()
  const filename = `${id}.${extension}`
  const key = userPhotosObjectKey(userId, filename)
  const s3 = getS3Client()
  const bucket = getS3Bucket()

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
      }),
    )
  } catch (err) {
    console.error('[media/upload] S3 PutObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ message: 'Storage upload failed' }, { status: 502 })
  }

  const url = await getPresignedGetUrl(key)
  const createdAt = new Date().toISOString()

  return NextResponse.json({
    url,
    name: filename,
    size: buffer.byteLength,
    createdAt,
  })
}
