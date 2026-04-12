import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import { revalidateWorkflowCampaignTreeCache } from '@/lib/graphql/revalidate-workflow-tree'
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
import { createMilestoneBodySchema, workflowIdParamSchema } from './schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function loadWorkflowRootOrThrow(workflowId: string, userId: string) {
  const data = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
  )
  const node = data.node
  if (!node) {
    return { error: NextResponse.json({ message: 'Workflow not found' }, { status: 404 }) }
  }
  if (node.nodeType !== 'workflow') {
    return { error: NextResponse.json({ message: 'Not a workflow root' }, { status: 400 }) }
  }
  if (node.locationId == null) {
    return { error: NextResponse.json({ message: 'Workflow has no location' }, { status: 400 }) }
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
    const parsed = workflowIdParamSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid workflow id' }, { status: 400 })
    }
    const workflowId = parsed.data

    const workflowRoot = await loadWorkflowRootOrThrow(workflowId, userId)
    if ('error' in workflowRoot) {
      return workflowRoot.error
    }

    const list = parseNodesData(
      await graphqlQuery<NodesDataRaw>(
        NODES_QUERY,
        {
          locationId: workflowRoot.locationId,
          nodeType: 'milestone',
          parentId: workflowId,
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
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await context.params
    const parsed = workflowIdParamSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid workflow id' }, { status: 400 })
    }
    const workflowId = parsed.data

    const workflowRoot = await loadWorkflowRootOrThrow(workflowId, userId)
    if ('error' in workflowRoot) {
      return workflowRoot.error
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
          locationId: workflowRoot.locationId,
          nodeType: 'milestone',
          parentId: workflowId,
          ...(name !== undefined ? { name } : {}),
        },
        userId,
      ),
    )

    const node = data.createNode
    if (!node) {
      return NextResponse.json({ message: 'Failed to create milestone' }, { status: 500 })
    }

    revalidateWorkflowCampaignTreeCache(userId, workflowId)

    return NextResponse.json(node, { status: 201 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to create milestone'
    return NextResponse.json({ message }, { status: 500 })
  }
}
