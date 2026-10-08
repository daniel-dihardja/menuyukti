import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'

import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/client'
import {
  POINT_EARN_ACTION_OPEN_MENU_QR,
  RECORD_POINT_EARN_EVENT_MUTATION,
  type RecordPointEarnEventData,
} from '@/lib/graphql/queries/point-ledger'

const recordPointEarnSchema = z.object({
  locationId: z.number().int().positive(),
  actionKey: z.literal(POINT_EARN_ACTION_OPEN_MENU_QR).default(POINT_EARN_ACTION_OPEN_MENU_QR),
})

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const payload = recordPointEarnSchema.parse(json)

    const data = await graphqlQuery<RecordPointEarnEventData>(
      RECORD_POINT_EARN_EVENT_MUTATION,
      {
        locationId: payload.locationId,
        actionKey: payload.actionKey,
      },
      userId,
      'RecordPointEarnEvent',
    )

    return NextResponse.json(
      {
        awarded: data.recordPointEarnEvent.awarded,
        balance: data.recordPointEarnEvent.balance,
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

    console.error('[public-menu/point-earn] POST', error)
    return NextResponse.json({ message: 'Failed to record point earn event' }, { status: 500 })
  }
}
