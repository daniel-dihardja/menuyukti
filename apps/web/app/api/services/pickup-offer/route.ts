import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CLOSE_PICKUP_OFFER_MUTATION,
  CREATE_PICKUP_OFFER_MUTATION,
  PICKUP_OFFERS_QUERY,
  type ClosePickupOfferData,
  type CreatePickupOfferData,
  type PickupOffersData,
} from '@/lib/graphql/queries/pickup-offers'

const createBodySchema = z.object({
  locationId: z.number().int().positive(),
  title: z.string().trim().min(1).max(256),
  description: z.string().trim().max(8000).default(''),
  availableFrom: z.string().min(1),
  availableUntil: z.string().min(1),
  price: z.number().nonnegative().nullable().optional(),
})

const closeBodySchema = z.object({
  offerId: z.number().int().positive(),
})

export async function GET(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationIdRaw = new URL(req.url).searchParams.get('locationId')
    const locationId = Number(locationIdRaw)
    if (!Number.isInteger(locationId) || locationId < 1) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 })
    }

    const data = await graphqlQuery<PickupOffersData>(
      PICKUP_OFFERS_QUERY,
      { locationId },
      userId,
      'PickupOffers',
    )

    return NextResponse.json({ pickupOffers: data.pickupOffers }, { status: 200 })
  } catch (error) {
    console.error('[services/pickup-offer] GET', error)
    return apiErrorFromUnknown(error, 'Failed to load pickup offers')
  }
}

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = createBodySchema.parse(await req.json())
    const data = await graphqlQuery<CreatePickupOfferData>(
      CREATE_PICKUP_OFFER_MUTATION,
      {
        input: {
          locationId: body.locationId,
          title: body.title,
          description: body.description,
          availableFrom: body.availableFrom,
          availableUntil: body.availableUntil,
          price: body.price ?? null,
        },
      },
      userId,
      'CreatePickupOffer',
    )

    return NextResponse.json(data.createPickupOffer, { status: 200 })
  } catch (error) {
    console.error('[services/pickup-offer] POST', error)
    return apiErrorFromUnknown(error, 'Failed to create pickup offer')
  }
}

export async function PATCH(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await req.json()
    const action = typeof raw?.action === 'string' ? raw.action : ''
    if (action !== 'close') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const { offerId } = closeBodySchema.parse(raw)
    const data = await graphqlQuery<ClosePickupOfferData>(
      CLOSE_PICKUP_OFFER_MUTATION,
      { offerId },
      userId,
      'ClosePickupOffer',
    )
    return NextResponse.json(data.closePickupOffer, { status: 200 })
  } catch (error) {
    console.error('[services/pickup-offer] PATCH', error)
    return apiErrorFromUnknown(error, 'Failed to update pickup offer')
  }
}
