import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { z } from 'zod'

import { getBuiltinAiFlowConfig } from '@/lib/assets/builtin-ai-flows'
import { backgroundObjectKey, isSafeBackgroundFilename } from '@/lib/assets/backgrounds'
import {
  getPresignedGetUrl,
  getS3Bucket,
  getS3Client,
  isSafeAssetFilename,
  userDesignsObjectKey,
  userObjectKey,
} from '@/lib/assets/storage'
import { runImageComposition } from '@/lib/leonardo'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const bodySchema = z.object({
  productName: z.string().min(1),
  backgroundName: z.string().min(1),
  flow: z.string().min(1),
  prompt: z.string().optional(),
})

const MAX_FLOW_SLUG_LEN = 128
const MAX_CUSTOM_PROMPT_LEN = 3000
const CUSTOM_FLOW_SLUG = 'custom'
const DEFAULT_CUSTOM_MODEL_FLOW = 'compose-on-background'
const OUTPUT_DIMENSION = 1024

function normalizeFlow(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s === '' || s === 'none') return 'none'
  if (s.length > MAX_FLOW_SLUG_LEN) return 'none'
  return s
}

function truncateStack(stack: string, max = 4000): string {
  if (stack.length <= max) return stack
  return `${stack.slice(0, max)}…(truncated)`
}

async function readObjectOrThrow(key: string): Promise<Buffer> {
  const s3 = getS3Client()
  const bucket = getS3Bucket()
  const source = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )
  const bytes = await source.Body?.transformToByteArray()
  if (!bytes) throw new Error('Object body is empty')
  return Buffer.from(bytes)
}

export async function POST(req: Request) {
  const authz = await requireMenuyuktiAdminApi()
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

  const productName = parsed.data.productName.trim()
  const backgroundName = parsed.data.backgroundName.trim()
  const flow = normalizeFlow(parsed.data.flow)
  const customPrompt = parsed.data.prompt?.trim() ?? ''

  if (!isSafeAssetFilename(productName) || !isSafeBackgroundFilename(backgroundName)) {
    return NextResponse.json({ message: 'Invalid filename' }, { status: 400 })
  }
  if (flow === 'none') {
    return NextResponse.json({ message: 'Flow is required' }, { status: 400 })
  }

  const config =
    flow === CUSTOM_FLOW_SLUG
      ? (() => {
          if (!customPrompt) return null
          if (customPrompt.length > MAX_CUSTOM_PROMPT_LEN) return null
          const fallback = getBuiltinAiFlowConfig(DEFAULT_CUSTOM_MODEL_FLOW)
          if (!fallback) return null
          return {
            ...fallback,
            prompt: customPrompt,
          }
        })()
      : getBuiltinAiFlowConfig(flow)

  if (!config) {
    return NextResponse.json(
      { message: flow === CUSTOM_FLOW_SLUG ? 'Invalid custom prompt' : 'Unknown AI flow' },
      { status: 400 },
    )
  }

  const productKey = userObjectKey(userId, productName)
  const backgroundKey = backgroundObjectKey(backgroundName)

  let productSourceBuffer: Buffer
  let backgroundSourceBuffer: Buffer
  try {
    ;[productSourceBuffer, backgroundSourceBuffer] = await Promise.all([
      readObjectOrThrow(productKey),
      readObjectOrThrow(backgroundKey),
    ])
  } catch (err) {
    console.error('[assets/designs/create] S3 GetObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
      productName,
      backgroundName,
    })
    return NextResponse.json({ message: 'Failed to read source images' }, { status: 502 })
  }

  let resizedProductWebp: Buffer
  let resizedBackgroundWebp: Buffer
  try {
    resizedProductWebp = await sharp(productSourceBuffer)
      .resize({ width: OUTPUT_DIMENSION, height: OUTPUT_DIMENSION, fit: 'contain' })
      .webp({ quality: 85 })
      .toBuffer()
    resizedBackgroundWebp = await sharp(backgroundSourceBuffer)
      .resize({ width: OUTPUT_DIMENSION, height: OUTPUT_DIMENSION, fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer()
  } catch (err) {
    console.error('[assets/designs/create] image preprocessing failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
      productName,
      backgroundName,
    })
    return NextResponse.json({ message: 'Failed to process source images' }, { status: 500 })
  }

  let outBuffer: Buffer
  try {
    outBuffer = await runImageComposition(
      resizedProductWebp,
      resizedBackgroundWebp,
      config,
      OUTPUT_DIMENSION,
      OUTPUT_DIMENSION,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    const stack = err instanceof Error ? err.stack : undefined
    const isInsufficientTokens = /insufficient tokens/i.test(message)
    console.error('[assets/designs/create] leonardo processing failed', {
      flow,
      userIdPrefix: userId.slice(0, 8),
      isInsufficientTokens,
      message,
      ...(stack ? { stack: truncateStack(stack) } : {}),
    })
    return NextResponse.json(
      {
        message,
        code: isInsufficientTokens ? ('leonardo_tokens' as const) : ('leonardo' as const),
      },
      { status: 502 },
    )
  }

  const filename = `${randomUUID()}.webp`
  const outputKey = userDesignsObjectKey(userId, filename)
  const createdAt = new Date().toISOString()

  try {
    const s3 = getS3Client()
    const bucket = getS3Bucket()
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: outputKey,
        Body: outBuffer,
        ContentType: 'image/webp',
      }),
    )
  } catch (err) {
    console.error('[assets/designs/create] S3 PutObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
      productName,
      backgroundName,
    })
    return NextResponse.json({ message: 'Storage upload failed' }, { status: 502 })
  }

  const url = await getPresignedGetUrl(outputKey)
  return NextResponse.json({
    url,
    name: filename,
    size: outBuffer.byteLength,
    createdAt,
  })
}
