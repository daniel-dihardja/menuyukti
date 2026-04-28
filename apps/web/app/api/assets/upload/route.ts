import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

import { getBuiltinAiFlowConfig } from '@/lib/assets/builtin-ai-flows'
import { getPresignedGetUrl, getS3Bucket, getS3Client, userObjectKey } from '@/lib/assets/storage'
import { runRemoveBackground } from '@/lib/leonardo'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
])

function truncateStack(stack: string, max = 4000): string {
  if (stack.length <= max) return stack
  return `${stack.slice(0, max)}…(truncated)`
}

const MAX_FLOW_SLUG_LEN = 128

function normalizeFlow(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s === '' || s === 'none') return 'none'
  if (s.length > MAX_FLOW_SLUG_LEN) return 'none'
  return s
}

/** Thrown when Leonardo `runRemoveBackground` fails (distinct from built-in config errors). */
class LeonardoInvocationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'LeonardoInvocationError'
  }
}

/** Flow-specific post-processing after resize + WebP encode. */
async function applyFlow(
  flow: string,
  buffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  if (flow === 'none') {
    return buffer
  }

  const config = getBuiltinAiFlowConfig(flow)
  if (!config) {
    return buffer
  }

  try {
    return await runRemoveBackground(buffer, config, width, height)
  } catch (err) {
    throw new LeonardoInvocationError(err instanceof Error ? err.message : 'Processing failed', {
      cause: err,
    })
  }
}

export async function POST(req: Request) {
  const authz = await requireMenuyuktiAdminApi()
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
    const isLeonardo = err instanceof LeonardoInvocationError
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
