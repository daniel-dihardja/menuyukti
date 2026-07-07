import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { getPresignedGetUrl, isObjectKeyForPost } from '@/lib/assets/storage'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  POST_QUERY,
  UPDATE_POST_PAGE_MUTATION,
  type PostData,
  type UpdatePostPageData,
} from '@/lib/graphql/queries/posts'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const idParamSchema = z.string().trim().min(1).regex(/^\d+$/)

const patchBodySchema = z.object({
  mediaS3Key: z.string().trim().min(1),
})

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

    const isKnownVersion =
      page.mediaS3Key === mediaS3Key ||
      page.mediaVersions.some((version) => version.mediaS3Key === mediaS3Key)
    if (!isKnownVersion) {
      return NextResponse.json({ error: 'Media version not found for this page' }, { status: 400 })
    }

    await graphqlQuery<UpdatePostPageData>(
      UPDATE_POST_PAGE_MUTATION,
      { id: pageIdParsed.data, mediaS3Key },
      authz.userId,
    )

    const imageUrl = await getPresignedGetUrl(mediaS3Key)

    return NextResponse.json({ imageUrl, mediaS3Key })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update post page image'
    if (message.includes('Not allowed')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
