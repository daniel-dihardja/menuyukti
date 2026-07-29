import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { requireAuthenticatedApi } from '@/lib/authenticated-api'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_MEDIA_COLLECTION_MUTATION,
  MEDIA_COLLECTIONS_QUERY,
  type CreateMediaCollectionData,
  type MediaCollectionsData,
} from '@/lib/graphql/queries/media-collections'

import { createMediaCollectionBodySchema } from './schema'

function mapError(message: string): { message: string; status: number } {
  if (message.includes('already exists')) {
    return { message, status: 409 }
  }
  if (message.includes('No workspace') || message.includes('Missing authenticated')) {
    return { message, status: 401 }
  }
  return { message, status: 502 }
}

export async function GET() {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const data = await graphqlQuery<MediaCollectionsData>(MEDIA_COLLECTIONS_QUERY, {}, userId)
    return NextResponse.json({ collections: data.mediaCollections })
  } catch (error) {
    console.error('[media/collections] GET', error)
    const message = error instanceof Error ? error.message : 'Failed to list collections'
    const mapped = mapError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}

export async function POST(req: Request) {
  try {
    const authz = await requireAuthenticatedApi()
    if (!authz.ok) return authz.response
    const { userId } = authz

    const json = await req.json()
    const body = createMediaCollectionBodySchema.parse(json)

    const data = await graphqlQuery<CreateMediaCollectionData>(
      CREATE_MEDIA_COLLECTION_MUTATION,
      { name: body.name },
      userId,
    )

    return NextResponse.json({ collection: data.createMediaCollection }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'Invalid input', issues: error.issues }, { status: 400 })
    }
    console.error('[media/collections] POST', error)
    const message = error instanceof Error ? error.message : 'Failed to create collection'
    const mapped = mapError(message)
    return NextResponse.json({ message: mapped.message }, { status: mapped.status })
  }
}
