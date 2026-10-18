import { revalidateTag } from 'next/cache'
import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createLocationParsedSchema } from './schema'
import { graphqlQuery } from '@/lib/graphql/client'
import { apiError, apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlLocationsDataCacheTag, revalidateTagAfterMutation } from '@/lib/graphql/cache-tags'
import {
  CREATE_LOCATION_MUTATION,
  ENSURE_MY_WORKSPACE_MUTATION,
  LOCATIONS_LIST_QUERY,
  MY_WORKSPACE_QUERY,
  UPDATE_LOCATION_MUTATION,
  type CreateLocationData,
  type EnsureMyWorkspaceData,
  type LocationsListData,
  type MyWorkspaceData,
  type UpdateLocationData,
} from '@/lib/graphql/queries'
import { openingHoursWeekToMutationInput } from './schema'

export async function GET() {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const data = await graphqlQuery<LocationsListData>(LOCATIONS_LIST_QUERY, { first: 100 }, userId)

    return NextResponse.json({
      locations: data.locations.map((loc) => ({
        id: Number(loc.id),
        name: loc.name,
      })),
    })
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to list locations')
  }
}

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const json = await req.json()
    const { name, street, city, country, currency, publicSlug, openingHours } =
      createLocationParsedSchema.parse(json)

    const wsData = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
    let workspaceId = wsData.myWorkspace?.id ?? null
    if (!workspaceId) {
      const ensured = await graphqlQuery<EnsureMyWorkspaceData>(
        ENSURE_MY_WORKSPACE_MUTATION,
        {},
        userId,
        'EnsureMyWorkspace',
      )
      workspaceId = ensured.ensureMyWorkspace?.id ?? null
    }
    if (!workspaceId) {
      return apiError(
        'FORBIDDEN',
        'No operator workspace. Contact Menuyukti staff to provision a workspace.',
        403,
      )
    }

    const data = await graphqlQuery<CreateLocationData>(
      CREATE_LOCATION_MUTATION,
      {
        workspaceId,
        name,
        street: street || null,
        city: city || null,
        country: country || null,
        currency: currency || null,
        publicSlug: publicSlug || null,
      },
      userId,
    )

    const location = data.createLocation
    if (!location) {
      return apiError('INTERNAL_ERROR', 'Failed to create location', 500)
    }

    if (openingHours) {
      const hoursPayload = openingHoursWeekToMutationInput(openingHours)
      if (hoursPayload.length > 0) {
        await graphqlQuery<UpdateLocationData>(
          UPDATE_LOCATION_MUTATION,
          {
            id: location.id,
            name,
            street: street || null,
            city: city || null,
            country: country || null,
            currency: currency || null,
            publicSlug: publicSlug || null,
            openingHours: hoursPayload,
          },
          userId,
        )
      }
    }

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to create location')
  }
}
