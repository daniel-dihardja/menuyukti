import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { getPresignedGetUrl } from '@/lib/assets/storage'
import {
  isPostKeyAllowedForAccess,
  requireWorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_POST_PAGE_MUTATION,
  POST_QUERY,
  UPDATE_POST_PAGE_MUTATION,
  type DeletePostPageData,
  type PostData,
  type UpdatePostPageData,
} from '@/lib/graphql/queries/posts'
import { POST_IMAGE_FORMAT_IDS, POST_IMAGE_QUALITY_IDS } from '@/lib/posts/leonardo-post-dimensions'
import { LEONARDO_POST_MODEL_IDS } from '@/lib/posts/leonardo-post-models'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const idParamSchema = z.string().trim().min(1).regex(/^\d+$/)

const patchBodySchema = z
  .object({
    mediaS3Key: z.string().trim().min(1).optional(),
    imageFormat: z.enum(POST_IMAGE_FORMAT_IDS).optional(),
    imageQuality: z.enum(POST_IMAGE_QUALITY_IDS).optional(),
    generationModel: z.enum(LEONARDO_POST_MODEL_IDS).optional(),
  })
  .refine(
    (body) =>
      body.mediaS3Key !== undefined ||
      body.imageFormat !== undefined ||
      body.imageQuality !== undefined ||
      body.generationModel !== undefined,
    { message: 'At least one field is required' },
  )

type RouteContext = {
  params: Promise<{ id: string; pageId: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }
    const mediaAccess = await requireWorkspaceMediaAccess(authz.userId, 'write')
    if (!mediaAccess.ok) return mediaAccess.response

    const { id: rawPostId, pageId: rawPageId } = await context.params
    const postIdParsed = idParamSchema.safeParse(rawPostId)
    const pageIdParsed = idParamSchema.safeParse(rawPageId)
    if (!postIdParsed.success || !pageIdParsed.success) {
      return NextResponse.json({ error: 'Invalid post or page id' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsedBody = patchBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { mediaS3Key, imageFormat, imageQuality, generationModel } = parsedBody.data

    const postData = await graphqlQuery<PostData>(
      POST_QUERY,
      { id: postIdParsed.data },
      authz.userId,
    )

    const post = postData.post
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const page = post.pages.find((candidate) => candidate.id === pageIdParsed.data)
    if (!page) {
      return NextResponse.json({ error: 'Post page not found' }, { status: 404 })
    }

    if (mediaS3Key !== undefined) {
      if (!isPostKeyAllowedForAccess(mediaAccess.access, mediaS3Key)) {
        return NextResponse.json({ error: 'Invalid media key' }, { status: 400 })
      }

      const isKnownVersion =
        page.mediaS3Key === mediaS3Key ||
        page.mediaVersions.some((version) => version.mediaS3Key === mediaS3Key)
      if (!isKnownVersion) {
        return NextResponse.json(
          { error: 'Media version not found for this page' },
          { status: 400 },
        )
      }
    }

    const updated = await graphqlQuery<UpdatePostPageData>(
      UPDATE_POST_PAGE_MUTATION,
      {
        id: pageIdParsed.data,
        ...(mediaS3Key !== undefined ? { mediaS3Key } : {}),
        ...(imageFormat !== undefined ? { imageFormat } : {}),
        ...(imageQuality !== undefined ? { imageQuality } : {}),
        ...(generationModel !== undefined ? { generationModel } : {}),
      },
      authz.userId,
    )

    const nextMediaS3Key = updated.updatePostPage.mediaS3Key
    const imageUrl =
      nextMediaS3Key && isPostKeyAllowedForAccess(mediaAccess.access, nextMediaS3Key)
        ? await getPresignedGetUrl(nextMediaS3Key)
        : null

    return NextResponse.json({
      imageUrl,
      mediaS3Key: nextMediaS3Key,
      imageFormat: updated.updatePostPage.imageFormat,
      imageQuality: updated.updatePostPage.imageQuality,
      generationModel: updated.updatePostPage.generationModel,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update post page image'
    if (message.includes('Not allowed')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('Invalid')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }
    const mediaAccess = await requireWorkspaceMediaAccess(authz.userId, 'delete')
    if (!mediaAccess.ok) return mediaAccess.response

    const { id: rawPostId, pageId: rawPageId } = await context.params
    const postIdParsed = idParamSchema.safeParse(rawPostId)
    const pageIdParsed = idParamSchema.safeParse(rawPageId)
    if (!postIdParsed.success || !pageIdParsed.success) {
      return NextResponse.json({ error: 'Invalid post or page id' }, { status: 400 })
    }

    const postData = await graphqlQuery<PostData>(
      POST_QUERY,
      { id: postIdParsed.data },
      authz.userId,
    )

    const post = postData.post
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const page = post.pages.find((candidate) => candidate.id === pageIdParsed.data)
    if (!page) {
      return NextResponse.json({ error: 'Post page not found' }, { status: 404 })
    }

    if (post.pages.length <= 1) {
      return NextResponse.json({ error: 'Post must keep at least one page' }, { status: 400 })
    }

    if (page.mediaS3Key || page.mediaVersions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a page that has generated images' },
        { status: 400 },
      )
    }

    await graphqlQuery<DeletePostPageData>(
      DELETE_POST_PAGE_MUTATION,
      { pageId: pageIdParsed.data },
      authz.userId,
    )

    const remainingPages = post.pages
      .filter((candidate) => candidate.id !== pageIdParsed.data)
      .toSorted((a, b) => a.sortOrder - b.sortOrder)
      .map((candidate, index) => ({
        id: candidate.id,
        sortOrder: index,
      }))

    return NextResponse.json({ pages: remainingPages })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete post page'
    if (message.includes('Not allowed')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('at least one page') || message.includes('generated images')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
