import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import {
  LOCATION_MENU_ITEM_FEEDBACKS_QUERY,
  type LocationMenuItemFeedbacksData,
  type MenuItemFeedbackStatus,
} from '@/lib/graphql/queries/menu-item-feedback'

type RouteContext = {
  params: Promise<{ id: string }>
}

function parseLocationId(param: string): number | null {
  const value = Number(param)
  return Number.isInteger(value) && value > 0 ? value : null
}

const statusSchema = z.enum(['PENDING', 'PUBLISHED', 'HIDDEN']).optional()

export async function GET(req: Request, context: RouteContext) {
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

    const url = new URL(req.url)
    const statusParam = url.searchParams.get('status')
    const status = statusSchema.parse(statusParam ? statusParam.toUpperCase() : undefined) as
      | MenuItemFeedbackStatus
      | undefined

    const data = await graphqlQuery<LocationMenuItemFeedbacksData>(
      LOCATION_MENU_ITEM_FEEDBACKS_QUERY,
      {
        locationId: locId,
        status: status ?? null,
      },
      userId,
      'LocationMenuItemFeedbacks',
    )

    return NextResponse.json(
      {
        feedbacks: data.locationMenuItemFeedbacks,
        pendingCount: data.locationMenuItemFeedbackPendingCount,
      },
      { status: 200 },
    )
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
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    console.error('[locations/menu/feedback] GET', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
