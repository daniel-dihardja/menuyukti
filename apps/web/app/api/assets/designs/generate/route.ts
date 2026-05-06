import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { z } from 'zod'

import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { getBuiltinAiFlowConfig } from '@/lib/assets/builtin-ai-flows'
import {
  getPresignedGetUrl,
  getS3Bucket,
  getS3Client,
  isSafeDesignFilename,
  userDesignsObjectKey,
} from '@/lib/assets/storage'
import { runRemoveBackground } from '@/lib/leonardo'

const bodySchema = z.object({
  name: z.string().min(1),
  flow: z.string().min(1),
  prompt: z.string().optional(),
})

const MAX_FLOW_SLUG_LEN = 128
const MAX_CUSTOM_PROMPT_LEN = 3000
const CUSTOM_FLOW_SLUG = 'custom'
const DEFAULT_CUSTOM_MODEL_FLOW = 'remove-background'

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

  const { name } = parsed.data
  const flow = normalizeFlow(parsed.data.flow)
  const customPrompt = parsed.data.prompt?.trim() ?? ''
  if (!isSafeDesignFilename(name)) {
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

  const s3 = getS3Client()
  const bucket = getS3Bucket()
  const sourceKey = userDesignsObjectKey(userId, name)

  let sourceBuffer: Buffer
  try {
    const source = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
      }),
    )
    const bytes = await source.Body?.transformToByteArray()
    if (!bytes) throw new Error('Object body is empty')
    sourceBuffer = Buffer.from(bytes)
  } catch (err) {
    console.error('[assets/designs/generate] S3 GetObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
      sourceName: name,
    })
    return NextResponse.json({ message: 'Failed to read source design' }, { status: 502 })
  }

  let rw = 0
  let rh = 0
  let resizedWebp: Buffer
  try {
    const metadata = await sharp(sourceBuffer).metadata()
    const width = metadata.width
    const height = metadata.height
    if (!width || !height) {
      return NextResponse.json({ message: 'Could not read image dimensions' }, { status: 400 })
    }

    const isLandscapeOrSquare = width >= height
    resizedWebp = await sharp(sourceBuffer)
      .resize(
        isLandscapeOrSquare
          ? { height: 1024, withoutEnlargement: false }
          : { width: 1024, withoutEnlargement: false },
      )
      .webp({ quality: 85 })
      .toBuffer()

    const resizedMeta = await sharp(resizedWebp).metadata()
    rw = resizedMeta.width ?? width
    rh = resizedMeta.height ?? height
  } catch (err) {
    console.error('[assets/designs/generate] image preprocessing failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
      sourceName: name,
    })
    return NextResponse.json({ message: 'Failed to process source image' }, { status: 500 })
  }

  let outBuffer: Buffer
  try {
    outBuffer = await runRemoveBackground(resizedWebp, config, rw, rh)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    const stack = err instanceof Error ? err.stack : undefined
    const isInsufficientTokens = /insufficient tokens/i.test(message)
    console.error('[assets/designs/generate] leonardo processing failed', {
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

  const id = randomUUID()
  const filename = `${id}.webp`
  const outputKey = userDesignsObjectKey(userId, filename)
  const createdAt = new Date().toISOString()

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: outputKey,
        Body: outBuffer,
        ContentType: 'image/webp',
      }),
    )
  } catch (err) {
    console.error('[assets/designs/generate] S3 PutObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
      sourceName: name,
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
