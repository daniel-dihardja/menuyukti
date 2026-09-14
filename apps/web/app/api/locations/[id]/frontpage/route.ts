import { revalidateTag } from 'next/cache'
import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'

import { updateLocationFrontpageSchema } from './schema'
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import { graphqlLocationsDataCacheTag, revalidateTagAfterMutation } from '@/lib/graphql/cache-tags'
import {
  UPDATE_LOCATION_FRONTPAGE_MUTATION,
  type UpdateLocationFrontpageData,
} from '@/lib/graphql/queries'

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

    const { id } = await context.params
    const locationId = Number(id)
    if (!Number.isInteger(locationId) || locationId < 1) {
      return NextResponse.json({ message: 'Invalid location id' }, { status: 400 })
    }

    const json = await req.json()
    const payload = updateLocationFrontpageSchema.parse(json)

    const data = await graphqlQuery<UpdateLocationFrontpageData>(
      UPDATE_LOCATION_FRONTPAGE_MUTATION,
      {
        locationId,
        tagline: payload.tagline ?? null,
        showGuestFavorites: payload.showGuestFavorites,
        showPopularCombos: payload.showPopularCombos,
      },
      userId,
    )

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)
    return NextResponse.json(data.updateLocationFrontpage, { status: 200 })
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
      const message = error.message
      if (message.toLowerCase().includes('access denied')) {
        return NextResponse.json({ message }, { status: 403 })
      }
      return NextResponse.json({ message }, { status: 400 })
    }

    console.error('[locations/frontpage] PATCH', error)
    return NextResponse.json({ message: 'Failed to update frontpage' }, { status: 500 })
  }
}
