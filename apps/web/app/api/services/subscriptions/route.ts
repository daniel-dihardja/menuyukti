import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  ACTIVATE_SERVICE_SUBSCRIPTION_MUTATION,
  CANCEL_SERVICE_SUBSCRIPTION_MUTATION,
  SERVICE_KEY_CASHBACK,
  SERVICE_KEY_DIGITAL_MENU,
  SERVICE_KEY_PICK_AND_WIN,
  SERVICE_KEY_POINT_SYSTEM,
  SERVICE_KEY_STAMP_CARD,
  SERVICE_KEY_VOTING,
  type ActivateServiceSubscriptionData,
  type CancelServiceSubscriptionData,
} from '@/lib/graphql/queries/service-subscriptions'

/** Keep in sync with SERVICE_KEYS — listed explicitly so Turbopack cannot serve a stale enum. */
const serviceKeySchema = z.enum([
  SERVICE_KEY_DIGITAL_MENU,
  SERVICE_KEY_POINT_SYSTEM,
  SERVICE_KEY_STAMP_CARD,
  SERVICE_KEY_CASHBACK,
  SERVICE_KEY_PICK_AND_WIN,
  SERVICE_KEY_VOTING,
])

const bodySchema = z.object({
  locationId: z.number().int().positive(),
  serviceKey: serviceKeySchema,
})

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { locationId, serviceKey } = bodySchema.parse(await req.json())
    const data = await graphqlQuery<ActivateServiceSubscriptionData>(
      ACTIVATE_SERVICE_SUBSCRIPTION_MUTATION,
      { locationId, serviceKey },
      userId,
      'ActivateServiceSubscription',
    )

    return NextResponse.json(data.activateServiceSubscription, { status: 200 })
  } catch (error) {
    console.error('[services/subscriptions] POST', error)
    return apiErrorFromUnknown(error, 'Failed to activate service subscription')
  }
}

export async function DELETE(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { locationId, serviceKey } = bodySchema.parse(await req.json())
    const data = await graphqlQuery<CancelServiceSubscriptionData>(
      CANCEL_SERVICE_SUBSCRIPTION_MUTATION,
      { locationId, serviceKey },
      userId,
      'CancelServiceSubscription',
    )

    return NextResponse.json(data.cancelServiceSubscription, { status: 200 })
  } catch (error) {
    console.error('[services/subscriptions] DELETE', error)
    return apiErrorFromUnknown(error, 'Failed to cancel service subscription')
  }
}
