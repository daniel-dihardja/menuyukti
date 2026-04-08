import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_NODE_MUTATION,
  NODE_QUERY,
  NODES_QUERY,
  parseCreateNodeData,
  parseNodeData,
  parseNodesData,
  type CreateNodeDataRaw,
  type NodeDataRaw,
  type NodesDataRaw,
} from '@/lib/graphql/queries'
import { campaignIdParamSchema, createMilestoneBodySchema } from './schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function loadCampaignOrThrow(campaignId: string, userId: string) {
  const data = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: campaignId }, userId),
  )
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

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await context.params
    const parsed = campaignIdParamSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid campaign id' }, { status: 400 })
    }
    const campaignId = parsed.data

    const campaign = await loadCampaignOrThrow(campaignId, userId)
    if ('error' in campaign) {
      return campaign.error
    }

    const list = parseNodesData(
      await graphqlQuery<NodesDataRaw>(
        NODES_QUERY,
        {
          locationId: campaign.locationId,
          nodeType: 'milestone',
          parentId: campaignId,
        },
        userId,
      ),
    )

    return NextResponse.json({ milestones: list.nodes })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to list milestones'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await context.params
    const parsed = campaignIdParamSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid campaign id' }, { status: 400 })
    }
    const campaignId = parsed.data

    const campaign = await loadCampaignOrThrow(campaignId, userId)
    if ('error' in campaign) {
      return campaign.error
    }

    let body: Record<string, unknown> = {}
    try {
      const text = await req.text()
      if (text.trim()) {
        body = JSON.parse(text) as Record<string, unknown>
      }
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const input = createMilestoneBodySchema.safeParse(body)
    if (!input.success) {
      return NextResponse.json(
        { message: 'Invalid input', issues: input.error.issues },
        { status: 400 },
      )
    }

    const name = input.data.name

    const data = parseCreateNodeData(
      await graphqlQuery<CreateNodeDataRaw>(
        CREATE_NODE_MUTATION,
        {
          locationId: campaign.locationId,
          nodeType: 'milestone',
          parentId: campaignId,
          ...(name !== undefined ? { name } : {}),
        },
        userId,
      ),
    )

    const node = data.createNode
    if (!node) {
      return NextResponse.json({ message: 'Failed to create milestone' }, { status: 500 })
    }

    return NextResponse.json(node, { status: 201 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to create milestone'
    return NextResponse.json({ message }, { status: 500 })
  }
}
