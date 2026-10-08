import { revalidateTag } from 'next/cache'
import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import { graphqlLocationsDataCacheTag, revalidateTagAfterMutation } from '@/lib/graphql/cache-tags'
import {
  UPDATE_LOCATION_PUBLIC_SLUG_MUTATION,
  type UpdateLocationPublicSlugData,
} from '@/lib/graphql/queries/public-location'

const updatePublicSlugSchema = z.object({
  publicSlug: z.string().max(128).nullable(),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

function parseLocationId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const locId = parseLocationId(id)
    if (!locId) {
      return NextResponse.json({ message: 'Invalid locationId' }, { status: 400 })
    }

    const json = await req.json()
    const payload = updatePublicSlugSchema.parse(json)

    const data = await graphqlQuery<UpdateLocationPublicSlugData>(
      UPDATE_LOCATION_PUBLIC_SLUG_MUTATION,
      {
        locationId: locId,
        publicSlug: payload.publicSlug,
      },
      userId,
      'UpdateLocationPublicSlug',
    )

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)
    return NextResponse.json(data.updateLocationPublicSlug, { status: 200 })
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

    console.error('[locations/public-slug] PATCH', error)
    return NextResponse.json({ message: 'Failed to update public slug' }, { status: 500 })
  }
}
