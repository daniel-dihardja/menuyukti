import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  ADD_MEDIA_TO_COLLECTION_MUTATION,
  DELETE_MEDIA_COLLECTION_MUTATION,
  MEDIA_COLLECTION_QUERY,
  REMOVE_MEDIA_FROM_COLLECTION_MUTATION,
  UPDATE_MEDIA_COLLECTION_MUTATION,
  type AddMediaToCollectionData,
  type DeleteMediaCollectionData,
  type MediaCollectionData,
  type RemoveMediaFromCollectionData,
  type UpdateMediaCollectionData,
} from '@/lib/graphql/queries/media-collections'

import { mediaCollectionMemberBodySchema, updateMediaCollectionBodySchema } from '../schema'

function mapError(message: string): { message: string; status: number } {
  if (message.includes('not found') || message.includes('Collection not found')) {
    return { message, status: 404 }
  }
  if (message.includes('already exists')) {
    return { message, status: 409 }
  }
  if (message.includes('Not allowed')) {
    return { message, status: 403 }
  }
  if (message.includes('Missing authenticated')) {
    return { message, status: 401 }
  }
  return { message, status: 502 }
}

type RouteContext = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = parseId(rawId)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid collection id' }, { status: 400 })
    }

    const data = await graphqlQuery<MediaCollectionData>(MEDIA_COLLECTION_QUERY, { id }, userId)
    if (!data.mediaCollection) {
      return NextResponse.json({ message: 'Collection not found' }, { status: 404 })
    }
    return NextResponse.json({ collection: data.mediaCollection })
  } catch (error) {
    console.error('[media/collections/[id]] GET', error)
    const message = error instanceof Error ? error.message : 'Failed to load collection'
    const mapped = mapError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = parseId(rawId)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid collection id' }, { status: 400 })
    }

    const json = await req.json()
    const body = updateMediaCollectionBodySchema.parse(json)

    const data = await graphqlQuery<UpdateMediaCollectionData>(
      UPDATE_MEDIA_COLLECTION_MUTATION,
      { id, name: body.name },
      userId,
    )
    return NextResponse.json({ collection: data.updateMediaCollection })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[media/collections/[id]] PATCH', error)
    const message = error instanceof Error ? error.message : 'Failed to update collection'
    const mapped = mapError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = parseId(rawId)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid collection id' }, { status: 400 })
    }

    await graphqlQuery<DeleteMediaCollectionData>(DELETE_MEDIA_COLLECTION_MUTATION, { id }, userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[media/collections/[id]] DELETE', error)
    const message = error instanceof Error ? error.message : 'Failed to delete collection'
    const mapped = mapError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const { id: rawId } = await context.params
    const id = parseId(rawId)
    if (id === null) {
      return NextResponse.json({ message: 'Invalid collection id' }, { status: 400 })
    }

    const json = await req.json()
    const action = typeof json?.action === 'string' ? json.action : 'add'
    const body = mediaCollectionMemberBodySchema.parse(json)

    if (action === 'remove') {
      const data = await graphqlQuery<RemoveMediaFromCollectionData>(
        REMOVE_MEDIA_FROM_COLLECTION_MUTATION,
        { collectionId: id, filename: body.filename },
        userId,
      )
      return NextResponse.json({ collection: data.removeMediaFromCollection })
    }

    const data = await graphqlQuery<AddMediaToCollectionData>(
      ADD_MEDIA_TO_COLLECTION_MUTATION,
      { collectionId: id, filename: body.filename },
      userId,
    )
    return NextResponse.json({ collection: data.addMediaToCollection })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[media/collections/[id]] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to update collection members'
    const mapped = mapError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}
