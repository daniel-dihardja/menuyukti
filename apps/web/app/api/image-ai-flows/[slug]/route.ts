import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_IMAGE_AI_FLOW_MUTATION,
  UPDATE_IMAGE_AI_FLOW_MUTATION,
  type DeleteImageAiFlowData,
  type UpdateImageAiFlowData,
} from '@/lib/graphql/queries'

import { updateImageAiFlowBodySchema } from '../schema'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { slug: rawSlug } = await context.params
    const slug = decodeURIComponent(rawSlug).trim()
    if (!slug) {
      return NextResponse.json({ message: 'Invalid slug' }, { status: 400 })
    }

    const json = await req.json()
    const body = updateImageAiFlowBodySchema.parse(json)

    const variables: Record<string, unknown> = { slug }
    if (body.newSlug !== undefined) variables.newSlug = body.newSlug
    if (body.displayName !== undefined) variables.displayName = body.displayName
    if (body.prompt !== undefined) variables.prompt = body.prompt
    if (body.model !== undefined) variables.model = body.model
    if (body.promptEnhance !== undefined) variables.promptEnhance = body.promptEnhance
    if (body.imageReferenceStrength !== undefined) {
      variables.imageReferenceStrength = body.imageReferenceStrength
    }
    if (body.styleIds !== undefined) variables.styleIds = body.styleIds
    if (body.isActive !== undefined) variables.isActive = body.isActive
    if (body.sortOrder !== undefined) variables.sortOrder = body.sortOrder

    const data = await graphqlQuery<UpdateImageAiFlowData>(
      UPDATE_IMAGE_AI_FLOW_MUTATION,
      variables,
      userId,
    )

    return NextResponse.json({ flow: data.updateImageAiFlow })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: 'Invalid input', issues: error.issues },
        { status: 400 },
      )
    }
    console.error('[image-ai-flows] PUT', error)
    const message = error instanceof Error ? error.message : 'Failed to update flow'
    const lower = message.toLowerCase()
    let status = 500
    if (lower.includes('not found')) status = 404
    else if (lower.includes('already exists') || lower.includes('invalid')) status = 400
    return NextResponse.json({ message }, { status })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { slug: rawSlug } = await context.params
    const slug = decodeURIComponent(rawSlug).trim()
    if (!slug) {
      return NextResponse.json({ message: 'Invalid slug' }, { status: 400 })
    }

    await graphqlQuery<DeleteImageAiFlowData>(
      DELETE_IMAGE_AI_FLOW_MUTATION,
      { slug },
      userId,
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[image-ai-flows] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to delete flow'
    const lower = message.toLowerCase()
    const status = lower.includes('not found') ? 404 : 500
    return NextResponse.json({ message }, { status })
  }
}
