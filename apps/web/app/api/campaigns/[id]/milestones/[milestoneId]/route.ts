import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_NODE_MUTATION,
  DELETE_NODE_MUTATION,
  NODE_QUERY,
  NODES_QUERY,
  UPDATE_NODE_MUTATION,
  type CreateNodeData,
  type DeleteNodeData,
  type NodeData,
  type NodesData,
  type UpdateNodeData,
} from '@/lib/graphql/queries'
import { campaignIdParamSchema, milestoneIdParamSchema, patchMilestoneSchema } from '../schema'

type RouteContext = {
  params: Promise<{ id: string; milestoneId: string }>
}

function passCriterionDisplayName(requirement: string): string {
  const t = requirement.trim()
  if (!t) {
    return 'Pass criterion'
  }
  return t.length > 500 ? `${t.slice(0, 497)}...` : t
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

async function assertPassCriteriaBelongsToMilestone(
  passCriteriaId: string,
  milestoneId: string,
  userId: string,
) {
  const data = await graphqlQuery<NodeData>(NODE_QUERY, { id: passCriteriaId }, userId)
  const n = data.node
  if (!n || n.nodeType !== 'passcriteria' || n.parentId !== milestoneId) {
    throw new Error('Invalid pass criterion id')
  }
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

    if (body.passCriteria === undefined) {
      const variables: Record<string, unknown> = { id: milestoneId }
      if (body.name !== undefined) {
        variables.name = body.name
      }
      const data = await graphqlQuery<UpdateNodeData>(UPDATE_NODE_MUTATION, variables, userId)
      return NextResponse.json(data.updateNode, { status: 200 })
    }

    if (body.name !== undefined) {
      await graphqlQuery<UpdateNodeData>(
        UPDATE_NODE_MUTATION,
        { id: milestoneId, name: body.name },
        userId,
      )
    }

    const existing = await graphqlQuery<NodesData>(
      NODES_QUERY,
      {
        locationId: campaign.locationId,
        nodeType: 'passcriteria',
        parentId: milestoneId,
      },
      userId,
    )

    const incoming = body.passCriteria
    const incomingIds = new Set(incoming.map((r) => r.id).filter(Boolean) as string[])

    for (const row of existing.nodes) {
      if (!incomingIds.has(row.id)) {
        await graphqlQuery<DeleteNodeData>(DELETE_NODE_MUTATION, { id: row.id }, userId)
      }
    }

    for (const row of incoming) {
      const displayName = passCriterionDisplayName(row.requirement)
      if (row.id) {
        await assertPassCriteriaBelongsToMilestone(row.id, milestoneId, userId)
        await graphqlQuery<UpdateNodeData>(
          UPDATE_NODE_MUTATION,
          {
            id: row.id,
            name: displayName,
            data: { requirement: row.requirement, status: row.status },
          },
          userId,
        )
      } else {
        await graphqlQuery<CreateNodeData>(
          CREATE_NODE_MUTATION,
          {
            locationId: campaign.locationId,
            nodeType: 'passcriteria',
            parentId: milestoneId,
            name: displayName,
            data: { requirement: row.requirement, status: row.status },
          },
          userId,
        )
      }
    }

    const milestoneAfter = await graphqlQuery<NodeData>(NODE_QUERY, { id: milestoneId }, userId)
    const passCriteriaAfter = await graphqlQuery<NodesData>(
      NODES_QUERY,
      {
        locationId: campaign.locationId,
        nodeType: 'passcriteria',
        parentId: milestoneId,
      },
      userId,
    )

    const m = milestoneAfter.node
    const passCriteria = passCriteriaAfter.nodes.map((n) => {
      const d = n.data as { requirement?: unknown; status?: unknown } | null | undefined
      const requirement = typeof d?.requirement === 'string' ? d.requirement : ''
      const status = d?.status
      const st =
        status === 'pass' || status === 'fail' || status === 'open' ? status : ('open' as const)
      return { id: n.id, requirement, status: st }
    })

    return NextResponse.json(
      {
        id: milestoneId,
        name: m?.name ?? '',
        nodeType: m?.nodeType ?? 'milestone',
        passCriteria,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to update milestone'
    const status = message === 'Invalid pass criterion id' ? 400 : 500
    return NextResponse.json({ message }, { status })
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
