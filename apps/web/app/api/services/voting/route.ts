import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CLOSE_VOTING_MUTATION,
  CREATE_VOTING_MUTATION,
  VOTINGS_QUERY,
  REWARD_MODE_POINTS,
  REWARD_MODE_SOCIAL,
  RESOLVE_VOTING_MUTATION,
  type CloseVotingData,
  type CreateVotingData,
  type VotingsData,
  type ResolveVotingData,
} from '@/lib/graphql/queries/votings'

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
  votingId: z.number().int().positive(),
})

const resolveBodySchema = z.object({
  votingId: z.number().int().positive(),
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

    const data = await graphqlQuery<VotingsData>(VOTINGS_QUERY, { locationId }, userId, 'Votings')

    return NextResponse.json({ votings: data.votings }, { status: 200 })
  } catch (error) {
    console.error('[services/voting] GET', error)
    return apiErrorFromUnknown(error, 'Failed to load votings')
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
    const data = await graphqlQuery<CreateVotingData>(
      CREATE_VOTING_MUTATION,
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
      'CreateVoting',
    )

    return NextResponse.json(data.createVoting, { status: 200 })
  } catch (error) {
    console.error('[services/voting] POST', error)
    return apiErrorFromUnknown(error, 'Failed to create voting')
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
      const { votingId } = closeBodySchema.parse(raw)
      const data = await graphqlQuery<CloseVotingData>(
        CLOSE_VOTING_MUTATION,
        { votingId },
        userId,
        'CloseVoting',
      )
      return NextResponse.json(data.closeVoting, { status: 200 })
    }

    if (action === 'resolve') {
      const { votingId, winningOutcomeId } = resolveBodySchema.parse(raw)
      const data = await graphqlQuery<ResolveVotingData>(
        RESOLVE_VOTING_MUTATION,
        { votingId, winningOutcomeId },
        userId,
        'ResolveVoting',
      )
      return NextResponse.json(data.resolveVoting, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[services/voting] PATCH', error)
    return apiErrorFromUnknown(error, 'Failed to update voting')
  }
}
