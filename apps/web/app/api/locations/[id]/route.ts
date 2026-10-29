import { revalidateTag } from 'next/cache'
import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'

import { openingHoursWeekToMutationInput, updateLocationParsedSchema } from '../schema'
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import { graphqlLocationsDataCacheTag, revalidateTagAfterMutation } from '@/lib/graphql/cache-tags'
import { apiError, apiErrorFromUnknown } from '@/lib/api/error-response'
import {
  DELETE_LOCATION_MUTATION,
  LOCATION_QUERY,
  UPDATE_LOCATION_MANUAL_BRIEF_MUTATION,
  UPDATE_LOCATION_MUTATION,
  type DeleteLocationData,
  type LocationData,
  type UpdateLocationData,
  type UpdateLocationManualBriefData,
} from '@/lib/graphql/queries'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isInteger(id) || id < 1) {
      return apiError('BAD_REQUEST', 'Invalid location id', 400)
    }

    const data = await graphqlQuery<LocationData>(
      LOCATION_QUERY,
      { id: String(id) },
      userId,
      'Location',
    )
    if (!data.location) {
      return apiError('NOT_FOUND', 'Location not found', 404)
    }

    return NextResponse.json({ location: data.location }, { status: 200 })
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      const message = error.message
      if (message.toLowerCase().includes('access denied')) {
        return apiError('FORBIDDEN', message, 403)
      }
      return apiError('BAD_REQUEST', message, 400)
    }
    console.error('[locations] GET', error)
    return apiErrorFromUnknown(error, 'Failed to load location')
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const json = await req.json()
    const payload = updateLocationParsedSchema.parse(json)

    const openingHours = openingHoursWeekToMutationInput(payload.openingHours)

    const data = await graphqlQuery<UpdateLocationData>(
      UPDATE_LOCATION_MUTATION,
      {
        id,
        name: payload.name,
        street: payload.street || null,
        city: payload.city || null,
        country: payload.country || null,
        currency: payload.currency || null,
        publicSlug: payload.publicSlug || null,
        openingHours,
      },
      userId,
    )

    if (payload.quickProfile !== undefined) {
      await graphqlQuery<UpdateLocationManualBriefData>(
        UPDATE_LOCATION_MANUAL_BRIEF_MUTATION,
        {
          locationId: Number.parseInt(id, 10),
          quickProfile: payload.quickProfile,
        },
        userId,
      )
    }

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)
    return NextResponse.json(data.updateLocation, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: 'Invalid input',
          issues: error.issues,
        },
        { status: 400 },
      )
    }

    if (error instanceof GraphQLRequestError) {
      // Surface owner-facing validator messages (e.g. "instagramHandle may only…").
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    console.error(error)
    return NextResponse.json({ message: 'Failed to update location' }, { status: 500 })
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
      return NextResponse.json({ message: 'Invalid location id' }, { status: 400 })
    }

    const data = await graphqlQuery<DeleteLocationData>(
      DELETE_LOCATION_MUTATION,
      { id: String(id) },
      userId,
    )

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)
    return NextResponse.json({ ok: data.deleteLocation }, { status: 200 })
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      const message = error.message
      if (message.toLowerCase().includes('access denied')) {
        return NextResponse.json({ message }, { status: 403 })
      }
      return NextResponse.json({ message }, { status: 400 })
    }

    console.error('[locations] DELETE', error)
    return NextResponse.json({ message: 'Failed to delete location' }, { status: 500 })
  }
}
