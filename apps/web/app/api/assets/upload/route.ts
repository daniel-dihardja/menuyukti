import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

import flows from '@/lib/assets/flows.json'
import { getPresignedGetUrl, getS3Bucket, getS3Client, userObjectKey } from '@/lib/assets/storage'
import { type NanoBananaFlowConfig, runRemoveBackground } from '@/lib/leonardo'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
])

const ALLOWED_FLOWS = new Set(['none', 'remove-background'])

function truncateStack(stack: string, max = 4000): string {
  if (stack.length <= max) return stack
  return `${stack.slice(0, max)}…(truncated)`
}

function normalizeFlow(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (ALLOWED_FLOWS.has(s)) return s
  return 'none'
}

type RemoveBackgroundFlowConfig = NanoBananaFlowConfig

/** Flow-specific post-processing after resize + WebP encode. */
async function applyFlow(
  flow: string,
  buffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  if (flow === 'remove-background') {
    const cfg = (flows as Record<string, RemoveBackgroundFlowConfig>)['remove-background']
    if (!cfg?.prompt || !cfg?.model) {
      throw new Error('remove-background flow is not configured')
    }
    return runRemoveBackground(buffer, cfg, width, height)
  }
  return buffer
}

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

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

  const buffer = Buffer.from(await file.arrayBuffer())
  const image = sharp(buffer)
  const metadata = await image.metadata()
  const { width, height } = metadata

  if (!width || !height) {
    return NextResponse.json({ message: 'Could not read image dimensions' }, { status: 400 })
  }

  const isLandscapeOrSquare = width >= height
  const resized = sharp(buffer).resize(
    isLandscapeOrSquare
      ? { height: 1024, withoutEnlargement: false }
      : { width: 1024, withoutEnlargement: false },
  )

  const resizedWebp = await resized.webp({ quality: 85 }).toBuffer()
  const resizedMeta = await sharp(resizedWebp).metadata()
  const rw = resizedMeta.width ?? width
  const rh = resizedMeta.height ?? height
  const flow = normalizeFlow(formData.get('flow'))

  let webpBuffer: Buffer
  try {
    webpBuffer = await applyFlow(flow, resizedWebp, rw, rh)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    const stack = err instanceof Error ? err.stack : undefined
    const isLeonardo =
      flow === 'remove-background' &&
      (message.includes('Leonardo') ||
        message.includes('LEONARDO_API_KEY') ||
        /insufficient tokens/i.test(message))
    const isInsufficientTokens = /insufficient tokens/i.test(message)
    console.error('[assets/upload] flow processing failed', {
      flow,
      userIdPrefix: userId.slice(0, 8),
      isLeonardo,
      isInsufficientTokens,
      message,
      ...(stack ? { stack: truncateStack(stack) } : {}),
    })
    return NextResponse.json(
      {
        message,
        ...(isLeonardo
          ? {
              code: isInsufficientTokens ? ('leonardo_tokens' as const) : ('leonardo' as const),
            }
          : {}),
      },
      { status: isLeonardo ? 502 : 500 },
    )
  }

  const id = randomUUID()
  const filename = `${id}.webp`
  const key = userObjectKey(userId, filename)
  const s3 = getS3Client()
  const bucket = getS3Bucket()

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
    console.error('[assets/upload] S3 PutObject failed', {
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
    size: webpBuffer.byteLength,
    createdAt,
  })
}
