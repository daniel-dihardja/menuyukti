import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_NODE_MUTATION,
  NODE_QUERY,
  UPDATE_NODE_MUTATION,
  type DeleteNodeData,
  type NodeData,
  type UpdateNodeData,
} from '@/lib/graphql/queries'
import { campaignIdParamSchema, milestoneIdParamSchema, patchMilestoneSchema } from '../schema'

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

async function validateMilestoneUnderCampaign(
  campaignId: string,
  milestoneId: string,
  userId: string,
) {
  const milestoneData = await graphqlQuery<NodeData>(NODE_QUERY, { id: milestoneId }, userId)
  const milestoneNode = milestoneData.node
  if (!milestoneNode) {
    return { error: NextResponse.json({ message: 'Milestone not found' }, { status: 404 }) }
  }
  if (milestoneNode.nodeType !== 'milestone') {
    return { error: NextResponse.json({ message: 'Not a milestone' }, { status: 400 }) }
  }
  if (milestoneNode.parentId !== campaignId) {
    return {
      error: NextResponse.json(
        { message: 'Milestone does not belong to this campaign' },
        { status: 400 },
      ),
    }
  }
  return { milestoneNode }
}

export async function PATCH(req: Request, context: RouteContext) {
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

    let json: unknown
    try {
      json = await req.json()
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = patchMilestoneSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid input', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const validated = await validateMilestoneUnderCampaign(campaignId, milestoneId, userId)
    if ('error' in validated) {
      return validated.error
    }

    const body = parsed.data
    const variables: Record<string, unknown> = { id: milestoneId }
    if (body.name !== undefined) {
      variables.name = body.name
    }
    if (body.passCriteria !== undefined) {
      variables.data = { passCriteria: body.passCriteria }
    }

    const data = await graphqlQuery<UpdateNodeData>(UPDATE_NODE_MUTATION, variables, userId)

    const node = data.updateNode
    return NextResponse.json(node, { status: 200 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to update milestone'
    return NextResponse.json({ message }, { status: 500 })
  }
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

    const validated = await validateMilestoneUnderCampaign(campaignId, milestoneId, userId)
    if ('error' in validated) {
      return validated.error
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
