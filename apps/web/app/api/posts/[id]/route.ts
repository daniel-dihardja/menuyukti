import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import {
  copyPostMediaKeyToWorkspace,
  deletePostMediaKeys,
  getPresignedGetUrl,
} from '@/lib/assets/storage'
import {
  isLegacyOwnerPostKey,
  isPostKeyAllowedForAccess,
  requireWorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_POST_MUTATION,
  POST_QUERY,
  UPDATE_POST_MUTATION,
  UPDATE_POST_PAGE_MUTATION,
  type DeletePostData,
  type PostData,
  type UpdatePostData,
  type UpdatePostPageData,
} from '@/lib/graphql/queries/posts'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { patchPostSchema } from './schema'

const idParamSchema = z.string().trim().min(1).regex(/^\d+$/)

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }
    const mediaAccess = await requireWorkspaceMediaAccess(authz.userId, 'read')
    if (!mediaAccess.ok) return mediaAccess.response

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }

    const data = await graphqlQuery<PostData>(POST_QUERY, { id: idParsed.data }, authz.userId)

    const post = data.post
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const pages = await Promise.all(
      post.pages.map(async (page) => {
        let imageUrl: string | null = null
        let mediaS3Key = page.mediaS3Key
        if (mediaS3Key && isPostKeyAllowedForAccess(mediaAccess.access, mediaS3Key)) {
          if (isLegacyOwnerPostKey(mediaAccess.access, mediaS3Key)) {
            try {
              const migratedKey = await copyPostMediaKeyToWorkspace(
                mediaS3Key,
                mediaAccess.access.workspaceId,
              )
              if (migratedKey !== mediaS3Key) {
                try {
                  await graphqlQuery<UpdatePostPageData>(
                    UPDATE_POST_PAGE_MUTATION,
                    { id: page.id, mediaS3Key: migratedKey },
                    authz.userId,
                  )
                  mediaS3Key = migratedKey
                } catch (err) {
                  console.error('[posts] failed to persist migrated media key', {
                    pageId: page.id,
                    message: err instanceof Error ? err.message : String(err),
                  })
                  mediaS3Key = migratedKey
                }
              }
            } catch (err) {
              console.error('[posts] failed to migrate legacy media key', {
                pageId: page.id,
                message: err instanceof Error ? err.message : String(err),
              })
            }
          }
          imageUrl = await getPresignedGetUrl(mediaS3Key)
        }

        const imageVersions = await Promise.all(
          page.mediaVersions.map(async (version) => {
            if (!isPostKeyAllowedForAccess(mediaAccess.access, version.mediaS3Key)) {
              return null
            }
            let versionKey = version.mediaS3Key
            if (isLegacyOwnerPostKey(mediaAccess.access, versionKey)) {
              try {
                versionKey = await copyPostMediaKeyToWorkspace(
                  versionKey,
                  mediaAccess.access.workspaceId,
                )
              } catch {
                // keep original key for presign
              }
            }
            const versionImageUrl = await getPresignedGetUrl(versionKey)
            return {
              id: version.id,
              mediaS3Key: versionKey,
              imageUrl: versionImageUrl,
              createdAt: version.createdAt,
            }
          }),
        )

        return {
          id: page.id,
          sortOrder: page.sortOrder,
          prompt: page.prompt,
          mediaS3Key,
          imageUrl,
          imageVersions: imageVersions.filter(
            (version): version is NonNullable<typeof version> => version !== null,
          ),
          imageFormat: page.imageFormat,
          imageQuality: page.imageQuality,
          generationModel: page.generationModel,
        }
      }),
    )

    return NextResponse.json({
      id: post.id,
      title: post.title,
      status: post.status,
      caption: post.caption,
      mediaType: post.mediaType,
      workspaceId: post.workspaceId,
      pages,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }

    const json = await req.json()
    const patch = patchPostSchema.parse(json)

    const data = await graphqlQuery<UpdatePostData>(
      UPDATE_POST_MUTATION,
      { id: idParsed.data, title: patch.title },
      authz.userId,
    )

    const post = data.updatePost
    return NextResponse.json({
      id: post.id,
      title: post.title,
      status: post.status,
      updatedAt: post.updatedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update post'
    if (message.includes('Post not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('Not allowed')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
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

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }

    const postData = await graphqlQuery<PostData>(POST_QUERY, { id: idParsed.data }, authz.userId)

    const post = postData.post
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    try {
      const mediaKeys = [
        ...new Set(
          post.pages.flatMap((page) => [
            page.mediaS3Key,
            ...page.mediaVersions.map((version) => version.mediaS3Key),
          ]),
        ),
      ].filter((key): key is string => Boolean(key))
      await deletePostMediaKeys(mediaKeys)
    } catch (err) {
      console.error('[posts/delete] S3 DeleteObject failed', {
        userIdPrefix: authz.userId.slice(0, 8),
        postId: idParsed.data,
        message: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ error: 'Failed to delete post images' }, { status: 502 })
    }

    const data = await graphqlQuery<DeletePostData>(
      DELETE_POST_MUTATION,
      { id: idParsed.data },
      authz.userId,
    )

    if (!data.deletePost) {
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete post'
    if (message.includes('Post not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('Not allowed')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
