import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import { VOTE_VOTING_MUTATION, type VoteVotingData } from '@/lib/graphql/queries/votings'

const bodySchema = z.object({
  votingId: z.number().int().positive(),
  outcomeId: z.number().int().positive(),
})

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { votingId, outcomeId } = bodySchema.parse(await req.json())
    const data = await graphqlQuery<VoteVotingData>(
      VOTE_VOTING_MUTATION,
      { votingId, outcomeId },
      userId,
      'VoteVoting',
    )

    return NextResponse.json(data.voteVoting, { status: 200 })
  } catch (error) {
    console.error('[customer/votings/vote] POST', error)
    return apiErrorFromUnknown(error, 'Failed to cast vote')
  }
}
