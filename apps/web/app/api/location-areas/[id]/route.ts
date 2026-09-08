import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidateTag } from 'next/cache'
import { ZodError } from 'zod'

import { updateLocationAreaBodySchema } from '../schema'
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import { graphqlLocationsDataCacheTag, revalidateTagAfterMutation } from '@/lib/graphql/cache-tags'
import {
  DELETE_LOCATION_AREA_MUTATION,
  UPDATE_LOCATION_AREA_MUTATION,
  type DeleteLocationAreaData,
  type UpdateLocationAreaData,
} from '@/lib/graphql/queries/locations'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ message: 'Invalid area id' }, { status: 400 })
    }

    const json = await req.json()
    const payload = updateLocationAreaBodySchema.parse(json)

    const variables: { id: number; name?: string; sortOrder?: number } = { id }
    if (payload.name !== undefined) variables.name = payload.name
    if (payload.sortOrder !== undefined) variables.sortOrder = payload.sortOrder

    const data = await graphqlQuery<UpdateLocationAreaData>(
      UPDATE_LOCATION_AREA_MUTATION,
      variables,
      userId,
    )

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)
    return NextResponse.json(data.updateLocationArea, { status: 200 })
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
    console.error('[location-areas] PATCH', error)
    return NextResponse.json({ message: 'Failed to update area' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ message: 'Invalid area id' }, { status: 400 })
    }

    const data = await graphqlQuery<DeleteLocationAreaData>(
      DELETE_LOCATION_AREA_MUTATION,
      { id },
      userId,
    )

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)
    return NextResponse.json({ ok: data.deleteLocationArea }, { status: 200 })
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    console.error('[location-areas] DELETE', error)
    return NextResponse.json({ message: 'Failed to delete area' }, { status: 500 })
  }
}
