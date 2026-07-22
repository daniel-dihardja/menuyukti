import { NextResponse } from 'next/server'
import { z } from 'zod'

import { MAX_GENERATION_REFERENCES } from '@/app/(protected)/ig-studio/post-creator/_components/post-creator-constants'
import { graphqlQuery } from '@/lib/graphql/client'
import { UPDATE_POST_PAGE_MUTATION, type UpdatePostPageData } from '@/lib/graphql/queries/posts'
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
import {
  generationReferenceSchema,
  runInstagramImageGeneration,
} from '@/lib/posts/run-instagram-image-generation'
import { requireMenuyuktiAdminOrInternalApi } from '@/lib/menuyukti-admin-api'

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

export async function POST(req: Request) {
  const authz = await requireMenuyuktiAdminOrInternalApi(req)
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

  const result = await runInstagramImageGeneration({
    userId,
    prompt,
    references,
    model,
    format,
    quality,
    styleId,
    logPrefix: '[posts/generate]',
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.error.message,
        ...(result.error.code ? { code: result.error.code } : {}),
      },
      { status: result.error.status },
    )
  }

  const { data } = result

  if (postId && pageId) {
    try {
      await graphqlQuery<UpdatePostPageData>(
        UPDATE_POST_PAGE_MUTATION,
        {
          id: pageId,
          mediaS3Key: data.mediaS3Key,
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

  return NextResponse.json({
    url: data.url,
    name: data.name,
    mediaS3Key: data.mediaS3Key,
    size: data.size,
    createdAt: data.createdAt,
    pageId: pageId ?? null,
  })
}
