import { revalidateTag } from 'next/cache'
import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createLocationSchema } from './schema'
import { ZodError } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import { graphqlLocationsDataCacheTag } from '@/lib/graphql/cache-tags'
import {
  CREATE_LOCATION_MUTATION,
  CREATE_WORKSPACE_MUTATION,
  MY_WORKSPACE_QUERY,
  UPDATE_LOCATION_MUTATION,
  type CreateLocationData,
  type CreateWorkspaceData,
  type MyWorkspaceData,
  type UpdateLocationData,
} from '@/lib/graphql/queries'
import { openingHoursWeekToMutationInput } from './schema'

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const { name, street, city, country, currency, openingHours } = createLocationSchema.parse(json)

    let workspaceId: string | undefined
    const wsData = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
    workspaceId = wsData.myWorkspace?.id
    if (!workspaceId) {
      const createdWs = await graphqlQuery<CreateWorkspaceData>(
        CREATE_WORKSPACE_MUTATION,
        { name: 'My workspace' },
        userId,
      )
      workspaceId = createdWs.createWorkspace.id
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
      },
      userId,
    )

    const location = data.createLocation
    if (!location) {
      return NextResponse.json({ message: 'Failed to create location' }, { status: 500 })
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
            openingHours: hoursPayload,
          },
          userId,
        )
      }
    }

    revalidateTag(graphqlLocationsDataCacheTag(userId), 'max')

    return NextResponse.json(location, { status: 201 })
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

    console.error(error)
    return NextResponse.json({ message: 'Failed to create location' }, { status: 500 })
  }
}
