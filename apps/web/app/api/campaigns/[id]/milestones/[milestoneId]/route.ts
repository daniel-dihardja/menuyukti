import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { DELETE_NODE_MUTATION, NODE_QUERY, type DeleteNodeData, type NodeData } from '@/lib/graphql/queries'
import { campaignIdParamSchema, milestoneIdParamSchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string; milestoneId: string }>
}

async function loadCampaignOrThrow(campaignId: string, userId: string) {
  const data = await graphqlQuery<NodeData>(NODE_QUERY, { id: campaignId }, userId)
  const node = data.node
  if (!node) {
    return { error: NextResponse.json({ message: 'Campaign not found' }, { status: 404 }) }
  }
  if (node.nodeType !== 'campaign') {
    return { error: NextResponse.json({ message: 'Not a campaign' }, { status: 400 }) }
  }
  if (node.locationId == null) {
    return { error: NextResponse.json({ message: 'Campaign has no location' }, { status: 400 }) }
  }
  return { node, locationId: node.locationId }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawCampaignId, milestoneId: rawMilestoneId } = await context.params

    const campaignParsed = campaignIdParamSchema.safeParse(rawCampaignId)
    const milestoneParsed = milestoneIdParamSchema.safeParse(rawMilestoneId)
    if (!campaignParsed.success || !milestoneParsed.success) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }
    const campaignId = campaignParsed.data
    const milestoneId = milestoneParsed.data

    const campaign = await loadCampaignOrThrow(campaignId, userId)
    if ('error' in campaign) {
      return campaign.error
    }

    const milestoneData = await graphqlQuery<NodeData>(NODE_QUERY, { id: milestoneId }, userId)
    const milestoneNode = milestoneData.node
    if (!milestoneNode) {
      return NextResponse.json({ message: 'Milestone not found' }, { status: 404 })
    }
    if (milestoneNode.nodeType !== 'milestone') {
      return NextResponse.json({ message: 'Not a milestone' }, { status: 400 })
    }
    if (milestoneNode.parentId !== campaignId) {
      return NextResponse.json({ message: 'Milestone does not belong to this campaign' }, { status: 400 })
    }

    try {
      await graphqlQuery<DeleteNodeData>(
        DELETE_NODE_MUTATION,
        { id: milestoneId },
        userId,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('Only the last milestone')) {
        return NextResponse.json({ message: msg }, { status: 400 })
      }
      throw err
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to delete milestone'
    return NextResponse.json({ message }, { status: 500 })
  }
}
