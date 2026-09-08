import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { createLocationAreaBodySchema } from './schema'
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import { graphqlLocationsDataCacheTag, revalidateTagAfterMutation } from '@/lib/graphql/cache-tags'
import {
  CREATE_LOCATION_AREA_MUTATION,
  type CreateLocationAreaData,
} from '@/lib/graphql/queries/locations'

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const payload = createLocationAreaBodySchema.parse(json)

    const data = await graphqlQuery<CreateLocationAreaData>(
      CREATE_LOCATION_AREA_MUTATION,
      {
        locationId: payload.locationId,
        name: payload.name,
        sortOrder: payload.sortOrder ?? null,
      },
      userId,
    )

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)
    return NextResponse.json(data.createLocationArea, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: 'Invalid input', issues: error.issues },
        { status: 400 },
      )
    }
    if (error instanceof GraphQLRequestError) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    console.error('[location-areas] POST', error)
    return NextResponse.json({ message: 'Failed to create area' }, { status: 500 })
  }
}
