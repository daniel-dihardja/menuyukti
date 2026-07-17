import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { z } from 'zod'

import { MAX_GENERATION_REFERENCES } from '@/app/(protected)/canvas/post-creator/_components/post-creator-constants'
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
import { LOCATION_STYLE_QUERY, type LocationStyleData } from '@/lib/graphql/queries/location-styles'
import { parseStyleSpec } from '@/lib/location-styles/style-spec'
import { runTextToImageWithReferences } from '@/lib/leonardo'
import {
  buildInstagramPostPrompt,
  type OutputDimensions,
  type PromptReference,
  type StylePackPrompt,
} from '@/lib/posts/build-instagram-post-prompt'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  LEONARDO_POST_MODEL_IDS,
} from '@/lib/posts/leonardo-post-models'
import { resolveGenerationOutputDimensions } from '@/lib/posts/post-creator-utils'
import type { GenerationMode } from '@/lib/posts/resolve-generation-references'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const generationReferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('template'),
    name: z.string().min(1),
  }),
  z.object({
    type: z.literal('previous-result'),
    filename: z.string().min(1),
  }),
  z.object({
    type: z.literal('photo'),
    name: z.string().min(1),
  }),
])

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(3000),
  postId: z.string().regex(/^\d+$/).optional(),
  pageId: z.string().regex(/^\d+$/).optional(),
  references: z.array(generationReferenceSchema).max(MAX_GENERATION_REFERENCES).optional(),
  model: z.enum(LEONARDO_POST_MODEL_IDS).optional(),
  styleId: z.number().int().positive().optional(),
})

function truncateStack(stack: string, max = 4000): string {
  if (stack.length <= max) return stack
  return `${stack.slice(0, max)}…(truncated)`
}

async function readImageDimensions(buffer: Buffer): Promise<OutputDimensions> {
  const metadata = await sharp(buffer, { autoOrient: true }).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions')
  }
  return { width: metadata.width, height: metadata.height }
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
    let styleData: LocationStyleData
    try {
      styleData = await graphqlQuery<LocationStyleData>(
        LOCATION_STYLE_QUERY,
        { id: styleId },
        userId,
      )
    } catch (err) {
      console.error('[posts/generate] locationStyle query failed', {
        userIdPrefix: userId.slice(0, 8),
        styleId,
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ message: 'Failed to load style pack' }, { status: 502 })
    }
    const style = styleData.locationStyle
    if (!style) {
      return NextResponse.json({ message: 'Style pack not found' }, { status: 404 })
    }
    stylePack = {
      name: style.name,
      rules: style.rules,
      styleSpec: parseStyleSpec(style.styleSpec),
    }
    styleImageName = style.referenceImageName
  }

  if (references.length + (stylePack ? 1 : 0) > MAX_GENERATION_REFERENCES) {
    return NextResponse.json(
      { message: `Too many reference images (max ${MAX_GENERATION_REFERENCES})` },
      { status: 400 },
    )
  }

  const hasTemplate = references.some((reference) => reference.type === 'template')
  const hasPrevious = references.some((reference) => reference.type === 'previous-result')
  if (hasTemplate && hasPrevious) {
    return NextResponse.json(
      { message: 'Template and previous result cannot be used together' },
      { status: 400 },
    )
  }

  const enabledPhotoCount = references.filter((reference) => reference.type === 'photo').length

  let mode: GenerationMode
  if (hasTemplate) {
    mode = 'template-composite'
  } else if (hasPrevious && enabledPhotoCount === 0) {
    mode = 'filled-edit'
  } else {
    mode = 'fresh-scene'
  }

  const referenceBuffers: Buffer[] = []
  const promptReferences: PromptReference[] = []
  let templateOutputDimensions: OutputDimensions | undefined
  let previousResultOutputDimensions: OutputDimensions | undefined

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
    if (reference.type === 'template') {
      const { name } = reference
      if (!isSafePhotoFilename(name)) {
        return NextResponse.json({ message: `Invalid template image: ${name}` }, { status: 400 })
      }

      const key = userPhotosObjectKey(userId, name)
      if (!isObjectKeyForPhoto(key, userId)) {
        return NextResponse.json({ message: `Invalid template image: ${name}` }, { status: 400 })
      }

      const buffer = await loadReferenceBuffer(key, name, userId)
      if (buffer instanceof NextResponse) return buffer
      try {
        templateOutputDimensions = await readImageDimensions(buffer)
      } catch (err) {
        console.error('[posts/generate] template dimension read failed', {
          userIdPrefix: userId.slice(0, 8),
          name,
          message: err instanceof Error ? err.message : String(err),
        })
        return NextResponse.json(
          { message: `Could not read template dimensions: ${name}` },
          { status: 400 },
        )
      }
      referenceBuffers.push(buffer)
      promptReferences.push({ type: 'template' })
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
      try {
        previousResultOutputDimensions = await readImageDimensions(buffer)
      } catch (err) {
        console.error('[posts/generate] previous result dimension read failed', {
          userIdPrefix: userId.slice(0, 8),
          filename,
          message: err instanceof Error ? err.message : String(err),
        })
        return NextResponse.json(
          { message: `Could not read previous result dimensions: ${filename}` },
          { status: 400 },
        )
      }
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
    mode,
    templateDimensions: templateOutputDimensions,
    previousResultDimensions: previousResultOutputDimensions,
  })
  const { width: outputWidth, height: outputHeight } = outputDimensions

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
      mode === 'template-composite' ? referenceBuffers.map(() => 'HIGH' as const) : undefined,
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
