import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
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
  isObjectKeyForPost,
  isSafeAssetFilename,
  isSafePhotoFilename,
  userPostsObjectKey,
  userPhotosObjectKey,
} from '@/lib/assets/storage'
import { graphqlQuery } from '@/lib/graphql/client'
import { UPDATE_POST_PAGE_MUTATION, type UpdatePostPageData } from '@/lib/graphql/queries/posts'
import { runTextToImageWithReferences } from '@/lib/leonardo'
import {
  buildInstagramPostPrompt,
  type ReferenceImageSource,
} from '@/lib/posts/build-instagram-post-prompt'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const MAX_REFERENCE_IMAGES = 4

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(3000),
  postId: z.string().regex(/^\d+$/).optional(),
  pageId: z.string().regex(/^\d+$/).optional(),
  referenceImages: z.array(z.string().min(1)).max(MAX_REFERENCE_IMAGES).optional(),
  referencePostImages: z.array(z.string().min(1)).max(MAX_REFERENCE_IMAGES).optional(),
})

function truncateStack(stack: string, max = 4000): string {
  if (stack.length <= max) return stack
  return `${stack.slice(0, max)}…(truncated)`
}

async function loadReferenceBuffer(
  key: string,
  label: string,
  userId: string,
): Promise<Buffer | NextResponse> {
  const s3 = getS3Client()
  const bucket = getS3Bucket()

  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )
    const bytes = await result.Body?.transformToByteArray()
    if (!bytes) {
      return NextResponse.json({ message: `Reference image not found: ${label}` }, { status: 400 })
    }
    return Buffer.from(bytes)
  } catch (err) {
    console.error('[posts/generate] S3 GetObject failed for reference image', {
      userIdPrefix: userId.slice(0, 8),
      label,
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { message: `Failed to read reference image: ${label}` },
      { status: 400 },
    )
  }
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

  const { prompt, postId, pageId, referenceImages = [], referencePostImages = [] } = parsed.data
  if ((postId && !pageId) || (!postId && pageId)) {
    return NextResponse.json(
      { message: 'postId and pageId must be provided together' },
      { status: 400 },
    )
  }

  if (referenceImages.length + referencePostImages.length > MAX_REFERENCE_IMAGES) {
    return NextResponse.json({ message: 'Too many reference images' }, { status: 400 })
  }

  const referenceBuffers: Buffer[] = []

  for (const name of referenceImages) {
    if (!isSafePhotoFilename(name)) {
      return NextResponse.json({ message: `Invalid reference image: ${name}` }, { status: 400 })
    }

    const key = userPhotosObjectKey(userId, name)
    const buffer = await loadReferenceBuffer(key, name, userId)
    if (buffer instanceof NextResponse) return buffer
    referenceBuffers.push(buffer)
  }

  for (const name of referencePostImages) {
    if (!isSafeAssetFilename(name)) {
      return NextResponse.json(
        { message: `Invalid reference post image: ${name}` },
        { status: 400 },
      )
    }

    const key = userPostsObjectKey(userId, name)
    if (!isObjectKeyForPost(key, userId)) {
      return NextResponse.json(
        { message: `Invalid reference post image: ${name}` },
        { status: 400 },
      )
    }

    const buffer = await loadReferenceBuffer(key, name, userId)
    if (buffer instanceof NextResponse) return buffer
    referenceBuffers.push(buffer)
  }

  const referenceImageSource: ReferenceImageSource =
    referenceImages.length > 0 && referencePostImages.length > 0
      ? 'mixed'
      : referencePostImages.length > 0
        ? 'post'
        : 'photo'

  const leonardoPrompt = buildInstagramPostPrompt({
    userPrompt: prompt,
    referenceImageCount: referenceBuffers.length,
    referenceImageSource,
  })

  let outBuffer: Buffer
  try {
    outBuffer = await runTextToImageWithReferences(
      leonardoPrompt,
      POST_IMAGE_WIDTH,
      POST_IMAGE_HEIGHT,
      referenceBuffers,
    )
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

  if (postId && pageId) {
    try {
      await graphqlQuery<UpdatePostPageData>(
        UPDATE_POST_PAGE_MUTATION,
        { id: pageId, mediaS3Key: outputKey, prompt },
        userId,
      )
    } catch (err) {
      console.error('[posts/generate] updatePostPage failed', {
        userIdPrefix: userId.slice(0, 8),
        postId,
        pageId,
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ message: 'Failed to save image to post page' }, { status: 502 })
    }
  }

  const url = await getPresignedGetUrl(outputKey)
  return NextResponse.json({
    url,
    name: filename,
    mediaS3Key: outputKey,
    size: outBuffer.byteLength,
    createdAt,
    pageId: pageId ?? null,
  })
}
