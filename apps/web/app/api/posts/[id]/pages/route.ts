import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { copyPostMediaKey, getPresignedGetUrl } from '@/lib/assets/storage'
import {
  isPostKeyAllowedForAccess,
  requireWorkspaceMediaAccess,
  type WorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_POST_PAGE_MUTATION,
  POST_QUERY,
  type CreatePostPageData,
  type PostData,
} from '@/lib/graphql/queries/posts'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const MAX_POST_PAGES = 10

const idParamSchema = z.string().trim().min(1).regex(/^\d+$/)

const bodySchema = z.object({
  copyFromPageId: z.string().regex(/^\d+$/).optional(),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

async function pageToApiResponse(
  page: {
    id: string
    sortOrder: number
    prompt: string | null
    mediaS3Key: string | null
    imageFormat: string | null
    imageQuality: string | null
    generationModel: string | null
    mediaVersions: Array<{
      id: string
      mediaS3Key: string
      createdAt: string | null
    }>
  },
  access: WorkspaceMediaAccess,
) {
  let imageUrl: string | null = null
  if (page.mediaS3Key && isPostKeyAllowedForAccess(access, page.mediaS3Key)) {
    imageUrl = await getPresignedGetUrl(page.mediaS3Key)
  }

  const imageVersions = (
    await Promise.all(
      page.mediaVersions.map(async (version) => {
        if (!isPostKeyAllowedForAccess(access, version.mediaS3Key)) {
          return null
        }
        const versionImageUrl = await getPresignedGetUrl(version.mediaS3Key)
        return {
          id: version.id,
          mediaS3Key: version.mediaS3Key,
          imageUrl: versionImageUrl,
          createdAt: version.createdAt,
        }
      }),
    )
  ).filter((version): version is NonNullable<typeof version> => version !== null)

  return {
    id: page.id,
    sortOrder: page.sortOrder,
    prompt: page.prompt,
    mediaS3Key: page.mediaS3Key,
    imageUrl,
    imageVersions,
    imageFormat: page.imageFormat,
    imageQuality: page.imageQuality,
    generationModel: page.generationModel,
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }
    const mediaAccess = await requireWorkspaceMediaAccess(authz.userId, 'write')
    if (!mediaAccess.ok) return mediaAccess.response

    const { id: rawPostId } = await context.params
    const postIdParsed = idParamSchema.safeParse(rawPostId)
    if (!postIdParsed.success) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const parsedBody = bodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
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

    if (post.pages.length >= MAX_POST_PAGES) {
      return NextResponse.json(
        { error: 'Instagram carousels support up to 10 images.' },
        { status: 400 },
      )
    }

    const sortedPages = post.pages.toSorted((a, b) => a.sortOrder - b.sortOrder)
    const sourcePage = parsedBody.data.copyFromPageId
      ? sortedPages.find((page) => page.id === parsedBody.data.copyFromPageId)
      : sortedPages.at(-1)

    if (parsedBody.data.copyFromPageId && !sourcePage) {
      return NextResponse.json({ error: 'Source page not found' }, { status: 404 })
    }

    let mediaS3Key: string | undefined
    let prompt: string | undefined
    let imageFormat: string | undefined
    let imageQuality: string | undefined
    let generationModel: string | undefined

    if (sourcePage) {
      if (sourcePage.imageFormat) {
        imageFormat = sourcePage.imageFormat
      }
      if (sourcePage.imageQuality) {
        imageQuality = sourcePage.imageQuality
      }
      if (sourcePage.generationModel) {
        generationModel = sourcePage.generationModel
      }
    }

    if (
      sourcePage?.mediaS3Key &&
      isPostKeyAllowedForAccess(mediaAccess.access, sourcePage.mediaS3Key)
    ) {
      try {
        mediaS3Key = await copyPostMediaKey(
          sourcePage.mediaS3Key,
          mediaAccess.access.workspaceId,
          (k) => isPostKeyAllowedForAccess(mediaAccess.access, k),
        )
      } catch (err) {
        console.error('[posts/pages/create] S3 copy failed', {
          userIdPrefix: authz.userId.slice(0, 8),
          message: err instanceof Error ? err.message : String(err),
        })
        return NextResponse.json({ error: 'Failed to copy post image' }, { status: 502 })
      }
      if (sourcePage.prompt) {
        prompt = sourcePage.prompt
      }
    }

    const mutationData = await graphqlQuery<CreatePostPageData>(
      CREATE_POST_PAGE_MUTATION,
      {
        postId: postIdParsed.data,
        mediaS3Key,
        prompt,
        imageFormat,
        imageQuality,
        generationModel,
      },
      authz.userId,
    )

    const createdPage = await pageToApiResponse(mutationData.createPostPage, mediaAccess.access)

    return NextResponse.json(createdPage, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create post page'
    if (message.includes('maximum number of pages')) {
      return NextResponse.json(
        { error: 'Instagram carousels support up to 10 images.' },
        { status: 400 },
      )
    }
    if (message.includes('Not allowed')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
