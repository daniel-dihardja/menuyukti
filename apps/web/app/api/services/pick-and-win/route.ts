import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CLOSE_PREDICTION_MUTATION,
  CREATE_PREDICTION_MUTATION,
  PREDICTIONS_QUERY,
  REWARD_MODE_POINTS,
  REWARD_MODE_SOCIAL,
  RESOLVE_PREDICTION_MUTATION,
  type ClosePredictionData,
  type CreatePredictionData,
  type PredictionsData,
  type ResolvePredictionData,
} from '@/lib/graphql/queries/predictions'

const createBodySchema = z.object({
  locationId: z.number().int().positive(),
  question: z.string().trim().min(1).max(512),
  closesAt: z.string().min(1),
  outcomes: z.array(z.string().trim().min(1).max(256)).min(2),
  rewardMode: z.enum([REWARD_MODE_SOCIAL, REWARD_MODE_POINTS]),
  pointsForVote: z.number().int().min(0).default(0),
  pointsForCorrect: z.number().int().min(0).default(0),
})

const closeBodySchema = z.object({
  predictionId: z.number().int().positive(),
})

const resolveBodySchema = z.object({
  predictionId: z.number().int().positive(),
  winningOutcomeId: z.number().int().positive(),
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

    const data = await graphqlQuery<PredictionsData>(
      PREDICTIONS_QUERY,
      { locationId },
      userId,
      'Predictions',
    )

    return NextResponse.json({ predictions: data.predictions }, { status: 200 })
  } catch (error) {
    console.error('[services/pick-and-win] GET', error)
    return apiErrorFromUnknown(error, 'Failed to load predictions')
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
    const data = await graphqlQuery<CreatePredictionData>(
      CREATE_PREDICTION_MUTATION,
      {
        input: {
          locationId: body.locationId,
          question: body.question,
          closesAt: body.closesAt,
          outcomes: body.outcomes,
          rewardMode: body.rewardMode,
          pointsForVote: body.pointsForVote,
          pointsForCorrect: body.pointsForCorrect,
        },
      },
      userId,
      'CreatePrediction',
    )

    return NextResponse.json(data.createPrediction, { status: 200 })
  } catch (error) {
    console.error('[services/pick-and-win] POST', error)
    return apiErrorFromUnknown(error, 'Failed to create prediction')
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

    if (action === 'close') {
      const { predictionId } = closeBodySchema.parse(raw)
      const data = await graphqlQuery<ClosePredictionData>(
        CLOSE_PREDICTION_MUTATION,
        { predictionId },
        userId,
        'ClosePrediction',
      )
      return NextResponse.json(data.closePrediction, { status: 200 })
    }

    if (action === 'resolve') {
      const { predictionId, winningOutcomeId } = resolveBodySchema.parse(raw)
      const data = await graphqlQuery<ResolvePredictionData>(
        RESOLVE_PREDICTION_MUTATION,
        { predictionId, winningOutcomeId },
        userId,
        'ResolvePrediction',
      )
      return NextResponse.json(data.resolvePrediction, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[services/pick-and-win] PATCH', error)
    return apiErrorFromUnknown(error, 'Failed to update prediction')
  }
}
