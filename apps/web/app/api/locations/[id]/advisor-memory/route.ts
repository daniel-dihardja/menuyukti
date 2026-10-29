import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { apiError, apiErrorFromUnknown } from '@/lib/api/error-response'
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import {
  LOCATION_ADVISOR_MEMORY_QUERY,
  UPDATE_LOCATION_ADVISOR_MEMORY_MUTATION,
  type LocationAdvisorMemory,
  type LocationAdvisorMemoryData,
  type UpdateLocationAdvisorMemoryData,
} from '@/lib/graphql/queries'

type RouteContext = {
  params: Promise<{ id: string }>
}

function parseLocationId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

function emptyMemory(locationId: number): LocationAdvisorMemory {
  return { locationId, content: '', updatedAt: null }
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const { id: idParam } = await context.params
    const locationId = parseLocationId(idParam)
    if (!locationId) {
      return apiError('BAD_REQUEST', 'Invalid location id', 400)
    }

    const data = await graphqlQuery<LocationAdvisorMemoryData>(
      LOCATION_ADVISOR_MEMORY_QUERY,
      { id: String(locationId) },
      userId,
      'LocationAdvisorMemory',
    )
    if (!data.location) {
      return apiError('NOT_FOUND', 'Location not found', 404)
    }

    const memory = data.location.advisorMemory ?? emptyMemory(locationId)
    return NextResponse.json({ advisorMemory: memory }, { status: 200 })
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      const message = error.message
      if (message.toLowerCase().includes('access denied')) {
        return apiError('FORBIDDEN', message, 403)
      }
      return apiError('BAD_REQUEST', message, 400)
    }
    console.error('[locations/advisor-memory] GET', error)
    return apiErrorFromUnknown(error, 'Failed to load advisor memory')
  }
}

/** Clear advisor memory (empty content). Does not modify owner quickProfile. */
export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const { id: idParam } = await context.params
    const locationId = parseLocationId(idParam)
    if (!locationId) {
      return apiError('BAD_REQUEST', 'Invalid location id', 400)
    }

    const data = await graphqlQuery<UpdateLocationAdvisorMemoryData>(
      UPDATE_LOCATION_ADVISOR_MEMORY_MUTATION,
      { locationId, content: '' },
      userId,
      'UpdateLocationAdvisorMemory',
    )

    return NextResponse.json({ advisorMemory: data.updateLocationAdvisorMemory }, { status: 200 })
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      const message = error.message
      if (message.toLowerCase().includes('access denied')) {
        return apiError('FORBIDDEN', message, 403)
      }
      return apiError('BAD_REQUEST', message, 400)
    }
    console.error('[locations/advisor-memory] DELETE', error)
    return apiErrorFromUnknown(error, 'Failed to clear advisor memory')
  }
}
