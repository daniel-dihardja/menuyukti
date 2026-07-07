import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { deletePostMediaKeys, getPresignedGetUrl, isObjectKeyForPost } from '@/lib/assets/storage'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_POST_PAGE_MEDIA_VERSION_MUTATION,
  POST_QUERY,
  type DeletePostPageMediaVersionData,
  type PostData,
} from '@/lib/graphql/queries/posts'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const idParamSchema = z.string().trim().min(1).regex(/^\d+$/)

const deleteBodySchema = z.object({
  mediaS3Key: z.string().trim().min(1),
})

type RouteContext = {
  params: Promise<{ id: string; pageId: string }>
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }

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

    const parsedBody = deleteBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'mediaS3Key is required' }, { status: 400 })
    }

    const { mediaS3Key } = parsedBody.data
    if (!isObjectKeyForPost(mediaS3Key, authz.userId)) {
      return NextResponse.json({ error: 'Invalid media key' }, { status: 400 })
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

    const isKnownVersion = page.mediaVersions.some((version) => version.mediaS3Key === mediaS3Key)
    if (!isKnownVersion) {
      return NextResponse.json({ error: 'Media version not found for this page' }, { status: 400 })
    }

    const mutationData = await graphqlQuery<DeletePostPageMediaVersionData>(
      DELETE_POST_PAGE_MEDIA_VERSION_MUTATION,
      { pageId: pageIdParsed.data, mediaS3Key },
      authz.userId,
    )

    const updatedPage = mutationData.deletePostPageMediaVersion

    try {
      await deletePostMediaKeys([mediaS3Key])
    } catch (err) {
      console.error('[posts/pages/versions/delete] S3 DeleteObject failed', {
        userIdPrefix: authz.userId.slice(0, 8),
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json(
        { error: 'Failed to delete post image from storage' },
        { status: 502 },
      )
    }

    let imageUrl: string | null = null
    if (updatedPage.mediaS3Key && isObjectKeyForPost(updatedPage.mediaS3Key, authz.userId)) {
      imageUrl = await getPresignedGetUrl(updatedPage.mediaS3Key)
    }

    const imageVersions = (
      await Promise.all(
        updatedPage.mediaVersions.map(async (version) => {
          if (!isObjectKeyForPost(version.mediaS3Key, authz.userId)) {
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

    return NextResponse.json({
      mediaS3Key: updatedPage.mediaS3Key,
      imageUrl,
      imageVersions,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete post page media version'
    if (message.includes('Not allowed')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
