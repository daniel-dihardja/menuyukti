import { NextResponse, connection } from 'next/server'
import { ZodError } from 'zod'
import { z } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import { CREATE_POST_MUTATION, type CreatePostData } from '@/lib/graphql/queries/posts'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'

const createPostSchema = z.object({
  title: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    await connection()
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) {
      return authz.response
    }

    const json = await req.json().catch(() => ({}))
    const { title } = createPostSchema.parse(json)

    const data = await graphqlQuery<CreatePostData>(
      CREATE_POST_MUTATION,
      { title: title ?? null },
      authz.userId,
    )

    const post = data.createPost
    if (!post?.id) {
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
