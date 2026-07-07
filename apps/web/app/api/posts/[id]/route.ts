import { NextResponse, connection } from 'next/server'
import { z } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import { DELETE_POST_MUTATION, type DeletePostData } from '@/lib/graphql/queries/posts'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const idParamSchema = z.string().trim().min(1).regex(/^\d+$/)

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
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
