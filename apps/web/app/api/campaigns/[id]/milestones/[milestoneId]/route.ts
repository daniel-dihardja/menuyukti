import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { passCriteriaDataSchema } from '@/lib/graphql/node-schemas'
import {
  CREATE_NODE_MUTATION,
  DELETE_NODE_MUTATION,
  NODE_QUERY,
  NODES_QUERY,
  UPDATE_NODE_MUTATION,
  parseCreateNodeData,
  parseNodeData,
  parseNodesData,
  parseUpdateNodeData,
  type CreateNodeDataRaw,
  type DeleteNodeData,
  type NodeDataRaw,
  type NodesDataRaw,
  type UpdateNodeDataRaw,
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
  const data = parseNodeData(await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: campaignId }, userId))
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
  const milestoneData = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: milestoneId }, userId),
  )
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
  const data = parseNodeData(await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: passCriteriaId }, userId))
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

    if (body.move !== undefined) {
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
      const milestones = list.nodes.filter((n) => n.nodeType === 'milestone')
      const idx = milestones.findIndex((n) => n.id === milestoneId)
      if (idx === -1) {
        return NextResponse.json({ message: 'Milestone not found in campaign' }, { status: 404 })
      }
      const j = body.move === 'up' ? idx - 1 : idx + 1
      if (j < 0 || j >= milestones.length) {
        return NextResponse.json({ message: 'Cannot move milestone' }, { status: 400 })
      }
      // Swap positions in the sorted list, then assign sequential orders 1..n so stored
      // `order` always matches display order (avoids duplicate order values that made swaps a no-op).
      const reordered = [...milestones]
      const a = reordered[idx]
      const b = reordered[j]
      if (!a || !b) {
        return NextResponse.json({ message: 'Milestone not found' }, { status: 404 })
      }
      reordered[idx] = b
      reordered[j] = a

      for (let i = 0; i < reordered.length; i++) {
        const node = reordered[i]
        if (!node) {
          continue
        }
        parseUpdateNodeData(
          await graphqlQuery<UpdateNodeDataRaw>(
            UPDATE_NODE_MUTATION,
            { id: node.id, data: { order: i + 1 } },
            userId,
          ),
        )
      }

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (body.passCriteria === undefined) {
      const variables: Record<string, unknown> = { id: milestoneId }
      if (body.name !== undefined) {
        variables.name = body.name
      }
      if (body.goal !== undefined) {
        variables.data = { goal: body.goal }
      }
      const data = parseUpdateNodeData(
        await graphqlQuery<UpdateNodeDataRaw>(UPDATE_NODE_MUTATION, variables, userId),
      )
      return NextResponse.json(data.updateNode, { status: 200 })
    }

    if (body.name !== undefined) {
      const u = await graphqlQuery<UpdateNodeDataRaw>(
        UPDATE_NODE_MUTATION,
        { id: milestoneId, name: body.name },
        userId,
      )
      parseUpdateNodeData(u)
    }

    const existing = parseNodesData(
      await graphqlQuery<NodesDataRaw>(
        NODES_QUERY,
        {
          locationId: campaign.locationId,
          nodeType: 'passcriteria',
          parentId: milestoneId,
        },
        userId,
      ),
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
        parseUpdateNodeData(
          await graphqlQuery<UpdateNodeDataRaw>(
            UPDATE_NODE_MUTATION,
            {
              id: row.id,
              name: displayName,
              data: { requirement: row.requirement, status: row.status },
            },
            userId,
          ),
        )
      } else {
        parseCreateNodeData(
          await graphqlQuery<CreateNodeDataRaw>(
            CREATE_NODE_MUTATION,
            {
              locationId: campaign.locationId,
              nodeType: 'passcriteria',
              parentId: milestoneId,
              name: displayName,
              data: { requirement: row.requirement, status: row.status },
            },
            userId,
          ),
        )
      }
    }

    const milestoneAfter = parseNodeData(
      await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: milestoneId }, userId),
    )
    const passCriteriaAfter = parseNodesData(
      await graphqlQuery<NodesDataRaw>(
        NODES_QUERY,
        {
          locationId: campaign.locationId,
          nodeType: 'passcriteria',
          parentId: milestoneId,
        },
        userId,
      ),
    )

    const m = milestoneAfter.node
    const passCriteria = passCriteriaAfter.nodes.map((n) => {
      if (n.nodeType !== 'passcriteria') {
        return { id: n.id, requirement: '', status: 'open' as const }
      }
      if (n.data == null) {
        return { id: n.id, requirement: '', status: 'open' as const }
      }
      const parsed = passCriteriaDataSchema.safeParse(n.data)
      if (parsed.success) {
        return { id: n.id, requirement: parsed.data.requirement, status: parsed.data.status }
      }
      return { id: n.id, requirement: '', status: 'open' as const }
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
