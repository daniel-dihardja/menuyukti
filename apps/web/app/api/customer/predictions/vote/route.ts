import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  VOTE_PREDICTION_MUTATION,
  type VotePredictionData,
} from '@/lib/graphql/queries/predictions'

const bodySchema = z.object({
  predictionId: z.number().int().positive(),
  outcomeId: z.number().int().positive(),
})

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { predictionId, outcomeId } = bodySchema.parse(await req.json())
    const data = await graphqlQuery<VotePredictionData>(
      VOTE_PREDICTION_MUTATION,
      { predictionId, outcomeId },
      userId,
      'VotePrediction',
    )

    return NextResponse.json(data.votePrediction, { status: 200 })
  } catch (error) {
    console.error('[customer/predictions/vote] POST', error)
    return apiErrorFromUnknown(error, 'Failed to cast vote')
  }
}
