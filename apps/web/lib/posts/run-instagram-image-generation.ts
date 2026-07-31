/**
 * Shared Leonardo + S3 pipeline for Instagram image generation
 * (IG Studio posts and workflow Instagram items).
 */

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { z } from 'zod'

import { MAX_GENERATION_REFERENCES } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'
import {
  getPresignedGetUrl,
  getS3Bucket,
  getS3Client,
  isSafeAssetFilename,
  isSafePhotoFilename,
} from '@/lib/assets/storage'
import {
  requireWorkspaceMediaAccess,
  resolveObjectKey,
  writeObjectKey,
  type WorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  RECORD_AI_USAGE_EVENT_MUTATION,
  type RecordAiUsageEventData,
} from '@/lib/graphql/queries/ai-usage'
import { STYLE_QUERY, type StyleData } from '@/lib/graphql/queries/styles'
import { runTextToImageWithReferences } from '@/lib/leonardo'
import {
  buildInstagramPostPrompt,
  type PromptReference,
  type StylePackPrompt,
} from '@/lib/posts/build-instagram-post-prompt'
import { createSolidBackgroundBuffer } from '@/lib/posts/create-solid-background-buffer'
import {
  DEFAULT_POST_IMAGE_FORMAT,
  DEFAULT_POST_IMAGE_QUALITY,
  type PostImageFormatId,
  type PostImageQualityId,
} from '@/lib/posts/leonardo-post-dimensions'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import { resolveGenerationOutputDimensions } from '@/lib/posts/post-creator-utils'
import type { GenerationMode } from '@/lib/posts/resolve-generation-references'
import { parseStyleSpec } from '@/lib/styles/style-spec'

const solidBackgroundHexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected #rrggbb color')

export const generationReferenceSchema = z.discriminatedUnion('type', [
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

export type GenerationReferenceInput = z.infer<typeof generationReferenceSchema>

export type RunInstagramImageGenerationInput = {
  userId: string
  prompt: string
  references?: GenerationReferenceInput[]
  model?: LeonardoPostModelId
  format?: PostImageFormatId
  quality?: PostImageQualityId
  styleId?: number
  /** Log prefix for console errors (e.g. `[posts/generate]`). */
  logPrefix?: string
}

export type RunInstagramImageGenerationSuccess = {
  url: string
  name: string
  mediaS3Key: string
  size: number
  createdAt: string
}

export type RunInstagramImageGenerationFailure = {
  status: number
  message: string
  code?: 'leonardo' | 'leonardo_tokens'
}

export type RunInstagramImageGenerationResult =
  | { ok: true; data: RunInstagramImageGenerationSuccess }
  | { ok: false; error: RunInstagramImageGenerationFailure }

function truncateStack(stack: string, max = 4000): string {
  if (stack.length <= max) return stack
  return `${stack.slice(0, max)}…(truncated)`
}

async function loadReferenceBuffer(
  key: string,
  label: string,
  userId: string,
  logPrefix: string,
): Promise<Buffer | RunInstagramImageGenerationFailure> {
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
      return { status: 400, message: `Reference image not found: ${label}` }
    }
    return Buffer.from(bytes)
  } catch (err) {
    console.error(`${logPrefix} S3 GetObject failed for reference image`, {
      userIdPrefix: userId.slice(0, 8),
      label,
      message: err instanceof Error ? err.message : String(err),
    })
    return { status: 400, message: `Failed to read reference image: ${label}` }
  }
}

export async function runInstagramImageGeneration(
  input: RunInstagramImageGenerationInput,
): Promise<RunInstagramImageGenerationResult> {
  const logPrefix = input.logPrefix ?? '[instagram/generate]'
  const userId = input.userId
  const prompt = input.prompt
  const references = input.references ?? []
  const model = input.model ?? DEFAULT_LEONARDO_POST_MODEL
  const format = input.format ?? DEFAULT_POST_IMAGE_FORMAT
  const quality = input.quality ?? DEFAULT_POST_IMAGE_QUALITY
  const styleId = input.styleId

  const mediaAccessResult = await requireWorkspaceMediaAccess(userId, 'write')
  if (!mediaAccessResult.ok) {
    return {
      ok: false,
      error: {
        status: mediaAccessResult.response.status,
        message: 'Workspace not found',
      },
    }
  }
  const access: WorkspaceMediaAccess = mediaAccessResult.access

  let stylePack: StylePackPrompt | undefined
  let styleImageName: string | undefined
  if (styleId != null) {
    let styleData: StyleData
    try {
      styleData = await graphqlQuery<StyleData>(STYLE_QUERY, { id: styleId }, userId)
    } catch (err) {
      console.error(`${logPrefix} style query failed`, {
        userIdPrefix: userId.slice(0, 8),
        styleId,
        message: err instanceof Error ? err.message : String(err),
      })
      return { ok: false, error: { status: 502, message: 'Failed to load style pack' } }
    }
    const style = styleData.style
    if (!style) {
      return { ok: false, error: { status: 404, message: 'Style pack not found' } }
    }
    stylePack = {
      name: style.name,
      rules: style.rules,
      spec: parseStyleSpec(style.spec),
    }
    styleImageName = style.referenceImageName
  }

  if (references.length + (stylePack ? 1 : 0) > MAX_GENERATION_REFERENCES) {
    return {
      ok: false,
      error: {
        status: 400,
        message: `Too many reference images (max ${MAX_GENERATION_REFERENCES})`,
      },
    }
  }

  const hasPrevious = references.some((reference) => reference.type === 'previous-result')
  const hasBackgroundColor = references.some((reference) => reference.type === 'background-color')
  if (hasBackgroundColor && hasPrevious) {
    return {
      ok: false,
      error: {
        status: 400,
        message: 'Solid background canvas cannot be used with a previous result image',
      },
    }
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
      return {
        ok: false,
        error: { status: 400, message: `Invalid style reference image: ${styleImageName}` },
      }
    }
    const styleKey = await resolveObjectKey(access, 'photos', styleImageName)
    if (!styleKey) {
      return {
        ok: false,
        error: { status: 400, message: `Invalid style reference image: ${styleImageName}` },
      }
    }
    const styleBuffer = await loadReferenceBuffer(styleKey, styleImageName, userId, logPrefix)
    if (!Buffer.isBuffer(styleBuffer)) {
      return { ok: false, error: styleBuffer }
    }
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
        return {
          ok: false,
          error: { status: 400, message: `Invalid previous result image: ${filename}` },
        }
      }

      const key = await resolveObjectKey(access, 'posts', filename)
      if (!key) {
        return {
          ok: false,
          error: { status: 400, message: `Invalid previous result image: ${filename}` },
        }
      }

      const buffer = await loadReferenceBuffer(key, filename, userId, logPrefix)
      if (!Buffer.isBuffer(buffer)) {
        return { ok: false, error: buffer }
      }
      referenceBuffers.push(buffer)
      promptReferences.push({ type: 'previous-result' })
      continue
    }

    const { name } = reference
    if (!isSafePhotoFilename(name)) {
      return {
        ok: false,
        error: { status: 400, message: `Invalid reference image: ${name}` },
      }
    }

    const key = await resolveObjectKey(access, 'photos', name)
    if (!key) {
      return {
        ok: false,
        error: { status: 400, message: `Invalid reference image: ${name}` },
      }
    }
    const buffer = await loadReferenceBuffer(key, name, userId, logPrefix)
    if (!Buffer.isBuffer(buffer)) {
      return { ok: false, error: buffer }
    }
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
      console.error(`${logPrefix} solid background synthesis failed`, {
        userIdPrefix: userId.slice(0, 8),
        color: deferred.color,
        message: err instanceof Error ? err.message : String(err),
      })
      return {
        ok: false,
        error: { status: 500, message: 'Failed to create solid background canvas' },
      }
    }
  }

  let outBuffer: Buffer
  let generationId: string | undefined
  try {
    const leonardoPrompt = buildInstagramPostPrompt({
      userPrompt: prompt,
      mode,
      references: promptReferences,
      outputDimensions,
      style: stylePack,
    })

    const leonardoResult = await runTextToImageWithReferences(
      leonardoPrompt,
      outputWidth,
      outputHeight,
      referenceBuffers,
      model,
    )
    outBuffer = leonardoResult.buffer
    generationId = leonardoResult.generationId
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    const stack = err instanceof Error ? err.stack : undefined
    const isInsufficientTokens = /insufficient tokens/i.test(message)
    console.error(`${logPrefix} leonardo processing failed`, {
      userIdPrefix: userId.slice(0, 8),
      isInsufficientTokens,
      message,
      ...(stack ? { stack: truncateStack(stack) } : {}),
    })
    return {
      ok: false,
      error: {
        status: 502,
        message,
        code: isInsufficientTokens ? 'leonardo_tokens' : 'leonardo',
      },
    }
  }

  const id = randomUUID()
  const filename = `${id}.webp`
  const outputKey = writeObjectKey(access, 'posts', filename)
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
    console.error(`${logPrefix} S3 PutObject failed`, {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, error: { status: 502, message: 'Storage upload failed' } }
  }

  const url = await getPresignedGetUrl(outputKey)

  try {
    await graphqlQuery<RecordAiUsageEventData>(
      RECORD_AI_USAGE_EVENT_MUTATION,
      {
        provider: 'leonardo',
        feature: 'post_generate',
        status: 'succeeded',
        model,
        externalId: generationId ?? null,
        units: 1,
        metadata: { format, quality },
      },
      userId,
    )
  } catch (err) {
    console.error(`${logPrefix} recordAiUsageEvent failed`, {
      userIdPrefix: userId.slice(0, 8),
      message: err instanceof Error ? err.message : String(err),
    })
  }

  return {
    ok: true,
    data: {
      url,
      name: filename,
      mediaS3Key: outputKey,
      size: outBuffer.byteLength,
      createdAt,
    },
  }
}
