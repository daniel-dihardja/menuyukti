import { revalidateTag } from 'next/cache'
import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import { graphqlLocationsDataCacheTag, revalidateTagAfterMutation } from '@/lib/graphql/cache-tags'
import {
  UPDATE_LOCATION_PUBLIC_MENU_MUTATION,
  type UpdateLocationPublicMenuData,
} from '@/lib/graphql/queries/location-menu'

const updatePublicMenuSchema = z.object({
  publicEnabled: z.boolean(),
  publicSlug: z.string().max(128).nullable(),
  headerImageFilename: z.string().max(512).nullable(),
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
    const payload = updatePublicMenuSchema.parse(json)

    const data = await graphqlQuery<UpdateLocationPublicMenuData>(
      UPDATE_LOCATION_PUBLIC_MENU_MUTATION,
      {
        locationId: locId,
        publicEnabled: payload.publicEnabled,
        publicSlug: payload.publicSlug,
        headerImageFilename: payload.headerImageFilename,
      },
      userId,
      'UpdateLocationPublicMenu',
    )

    revalidateTag(graphqlLocationsDataCacheTag(userId), revalidateTagAfterMutation)
    return NextResponse.json(data.updateLocationPublicMenu, { status: 200 })
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

    console.error('[locations/menu/public] PATCH', error)
    return NextResponse.json({ message: 'Failed to update public menu settings' }, { status: 500 })
  }
}
