import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireMenuyuktiAdminApi } from '@/lib/menuyukti-admin-api'
import { ZodError } from 'zod'

import { graphqlImageAiFlowsCacheTag } from '@/lib/graphql/cache-tags'
import { graphqlQuery } from '@/lib/graphql/client'
import { CREATE_IMAGE_AI_FLOW_MUTATION, type CreateImageAiFlowData } from '@/lib/graphql/queries'

import { createImageAiFlowBodySchema } from './schema'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const authz = await requireMenuyuktiAdminApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = createImageAiFlowBodySchema.parse(json)

    const data = await graphqlQuery<CreateImageAiFlowData>(
      CREATE_IMAGE_AI_FLOW_MUTATION,
      {
        slug: body.slug,
        displayName: body.displayName,
        prompt: body.prompt,
        model: body.model,
        promptEnhance: body.promptEnhance ?? null,
        imageReferenceStrength: body.imageReferenceStrength ?? null,
        styleIds: body.styleIds ?? null,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
      },
      userId,
    )

    revalidateTag(graphqlImageAiFlowsCacheTag(userId), 'max')

    return NextResponse.json({ flow: data.createImageAiFlow }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[image-ai-flows] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create flow'
    const lower = message.toLowerCase()
    const status = lower.includes('already exists') || lower.includes('invalid') ? 400 : 500
    return NextResponse.json({ message }, { status })
  }
}
