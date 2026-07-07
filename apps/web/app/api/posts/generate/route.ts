import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  POST_IMAGE_HEIGHT,
  POST_IMAGE_WIDTH,
} from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
import {
  getPresignedGetUrl,
  getS3Bucket,
  getS3Client,
  userPostsObjectKey,
} from '@/lib/assets/storage'
import { runTextToImageGeneration } from '@/lib/leonardo'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(3000),
})

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

  const { prompt } = parsed.data

  let outBuffer: Buffer
  try {
    outBuffer = await runTextToImageGeneration(prompt, POST_IMAGE_WIDTH, POST_IMAGE_HEIGHT)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    const stack = err instanceof Error ? err.stack : undefined
    const isInsufficientTokens = /insufficient tokens/i.test(message)
    console.error('[posts/generate] leonardo processing failed', {
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
  const outputKey = userPostsObjectKey(userId, filename)
  const createdAt = new Date().toISOString()

  const s3 = getS3Client()
  const bucket = getS3Bucket()

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
    console.error('[posts/generate] S3 PutObject failed', {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
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
