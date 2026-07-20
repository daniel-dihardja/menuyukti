import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { MAX_GENERATION_REFERENCES } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'
import {
  getPresignedGetUrl,
  getS3Bucket,
  getS3Client,
  isObjectKeyForPhoto,
  isObjectKeyForPost,
  isSafeAssetFilename,
  isSafePhotoFilename,
  userPostsObjectKey,
  userPhotosObjectKey,
} from '@/lib/assets/storage'
import { graphqlQuery } from '@/lib/graphql/client'
import { UPDATE_POST_PAGE_MUTATION, type UpdatePostPageData } from '@/lib/graphql/queries/posts'
import { STYLE_QUERY, type StyleData } from '@/lib/graphql/queries/styles'
import { parseStyleSpec } from '@/lib/styles/style-spec'
import { runTextToImageWithReferences } from '@/lib/leonardo'
import {
  buildInstagramPostPrompt,
  type PromptReference,
  type StylePackPrompt,
} from '@/lib/posts/build-instagram-post-prompt'
import {
  DEFAULT_POST_IMAGE_FORMAT,
  DEFAULT_POST_IMAGE_QUALITY,
  POST_IMAGE_FORMAT_IDS,
  POST_IMAGE_QUALITY_IDS,
} from '@/lib/posts/leonardo-post-dimensions'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  LEONARDO_POST_MODEL_IDS,
} from '@/lib/posts/leonardo-post-models'
import { resolveGenerationOutputDimensions } from '@/lib/posts/post-creator-utils'
import type { GenerationMode } from '@/lib/posts/resolve-generation-references'
import { createSolidBackgroundBuffer } from '@/lib/posts/create-solid-background-buffer'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const solidBackgroundHexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected #rrggbb color')

const generationReferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('previous-result'),
    filename: z.string().min(1),
  }),
  z.object({
    type: z.literal('photo'),
    name: z.string().min(1),
  }),
  z.object({
    type: z.literal('background-color'),
    color: solidBackgroundHexSchema,
  }),
])

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(3000),
  postId: z.string().regex(/^\d+$/).optional(),
  pageId: z.string().regex(/^\d+$/).optional(),
  references: z.array(generationReferenceSchema).max(MAX_GENERATION_REFERENCES).optional(),
  model: z.enum(LEONARDO_POST_MODEL_IDS).optional(),
  format: z.enum(POST_IMAGE_FORMAT_IDS).optional(),
  quality: z.enum(POST_IMAGE_QUALITY_IDS).optional(),
  styleId: z.number().int().positive().optional(),
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

  const {
    prompt,
    postId,
    pageId,
    references = [],
    model = DEFAULT_LEONARDO_POST_MODEL,
    format = DEFAULT_POST_IMAGE_FORMAT,
    quality = DEFAULT_POST_IMAGE_QUALITY,
    styleId,
  } = parsed.data
  if ((postId && !pageId) || (!postId && pageId)) {
    return NextResponse.json(
      { message: 'postId and pageId must be provided together' },
      { status: 400 },
    )
  }

  let stylePack: StylePackPrompt | undefined
  let styleImageName: string | undefined
  if (styleId != null) {
    let styleData: StyleData
    try {
      styleData = await graphqlQuery<StyleData>(STYLE_QUERY, { id: styleId }, userId)
    } catch (err) {
      console.error('[posts/generate] style query failed', {
        userIdPrefix: userId.slice(0, 8),
        styleId,
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ message: 'Failed to load style pack' }, { status: 502 })
    }
    const style = styleData.style
    if (!style) {
      return NextResponse.json({ message: 'Style pack not found' }, { status: 404 })
    }
    stylePack = {
      name: style.name,
      rules: style.rules,
      spec: parseStyleSpec(style.spec),
    }
    styleImageName = style.referenceImageName
  }

  if (references.length + (stylePack ? 1 : 0) > MAX_GENERATION_REFERENCES) {
    return NextResponse.json(
      { message: `Too many reference images (max ${MAX_GENERATION_REFERENCES})` },
      { status: 400 },
    )
  }

  const hasPrevious = references.some((reference) => reference.type === 'previous-result')
  const hasBackgroundColor = references.some((reference) => reference.type === 'background-color')
  if (hasBackgroundColor && hasPrevious) {
    return NextResponse.json(
      {
        message: 'Solid background canvas cannot be used with a previous result image',
      },
      { status: 400 },
    )
  }

  const enabledPhotoCount = references.filter((reference) => reference.type === 'photo').length

  let mode: GenerationMode
  if (hasPrevious && enabledPhotoCount === 0) {
    mode = 'filled-edit'
  } else {
    mode = 'fresh-scene'
  }

  const referenceBuffers: Buffer[] = []
  const promptReferences: PromptReference[] = []
  const deferredSolidBackgrounds: { color: string; bufferIndex: number }[] = []

  if (styleImageName) {
    if (!isSafePhotoFilename(styleImageName)) {
      return NextResponse.json(
        { message: `Invalid style reference image: ${styleImageName}` },
        { status: 400 },
      )
    }
    const styleKey = userPhotosObjectKey(userId, styleImageName)
    if (!isObjectKeyForPhoto(styleKey, userId)) {
      return NextResponse.json(
        { message: `Invalid style reference image: ${styleImageName}` },
        { status: 400 },
      )
    }
    const styleBuffer = await loadReferenceBuffer(styleKey, styleImageName, userId)
    if (styleBuffer instanceof NextResponse) return styleBuffer
    referenceBuffers.push(styleBuffer)
    promptReferences.push({ type: 'style' })
  }

  for (const reference of references) {
    if (reference.type === 'background-color') {
      deferredSolidBackgrounds.push({
        color: reference.color,
        bufferIndex: referenceBuffers.length,
      })
      referenceBuffers.push(Buffer.alloc(0))
      promptReferences.push({ type: 'background-color', color: reference.color })
      continue
    }

    if (reference.type === 'previous-result') {
      const { filename } = reference
      if (!isSafeAssetFilename(filename)) {
        return NextResponse.json(
          { message: `Invalid previous result image: ${filename}` },
          { status: 400 },
        )
      }

      const key = userPostsObjectKey(userId, filename)
      if (!isObjectKeyForPost(key, userId)) {
        return NextResponse.json(
          { message: `Invalid previous result image: ${filename}` },
          { status: 400 },
        )
      }

      const buffer = await loadReferenceBuffer(key, filename, userId)
      if (buffer instanceof NextResponse) return buffer
      referenceBuffers.push(buffer)
      promptReferences.push({ type: 'previous-result' })
      continue
    }

    const { name } = reference
    if (!isSafePhotoFilename(name)) {
      return NextResponse.json({ message: `Invalid reference image: ${name}` }, { status: 400 })
    }

    const key = userPhotosObjectKey(userId, name)
    const buffer = await loadReferenceBuffer(key, name, userId)
    if (buffer instanceof NextResponse) return buffer
    referenceBuffers.push(buffer)
    promptReferences.push({ type: 'photo' })
  }

  const outputDimensions = resolveGenerationOutputDimensions({
    model,
    format,
    quality,
  })
  const { width: outputWidth, height: outputHeight } = outputDimensions

  for (const deferred of deferredSolidBackgrounds) {
    try {
      referenceBuffers[deferred.bufferIndex] = await createSolidBackgroundBuffer(
        outputWidth,
        outputHeight,
        deferred.color,
      )
    } catch (err) {
      console.error('[posts/generate] solid background synthesis failed', {
        userIdPrefix: userId.slice(0, 8),
        color: deferred.color,
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json(
        { message: 'Failed to create solid background canvas' },
        { status: 500 },
      )
    }
  }

  let outBuffer: Buffer
  try {
    const leonardoPrompt = buildInstagramPostPrompt({
      userPrompt: prompt,
      mode,
      references: promptReferences,
      outputDimensions,
      style: stylePack,
    })

    outBuffer = await runTextToImageWithReferences(
      leonardoPrompt,
      outputWidth,
      outputHeight,
      referenceBuffers,
      model,
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
        {
          id: pageId,
          mediaS3Key: outputKey,
          prompt,
          imageFormat: format,
          imageQuality: quality,
          generationModel: model,
        },
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
