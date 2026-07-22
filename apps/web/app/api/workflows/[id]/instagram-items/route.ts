import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_INSTAGRAM_ITEM_MUTATION,
  INSTAGRAM_ITEMS_QUERY,
  type CreateInstagramItemData,
  type InstagramItemsData,
} from '@/lib/graphql/queries/instagram-items'
import { NODE_QUERY, parseNodeData, type NodeDataRaw } from '@/lib/graphql/queries'

import { createInstagramItemBodySchema, workflowIdParamSchema } from './schema'

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
    await connection()
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

    const data = await graphqlQuery<InstagramItemsData>(
      INSTAGRAM_ITEMS_QUERY,
      { workflowId },
      userId,
    )

    return NextResponse.json({ items: data.instagramItems })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to list Instagram items'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    await connection()
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

    const input = createInstagramItemBodySchema.safeParse(body)
    if (!input.success) {
      return NextResponse.json(
        { message: 'Invalid input', issues: input.error.issues },
        { status: 400 },
      )
    }

    const data = await graphqlQuery<CreateInstagramItemData>(
      CREATE_INSTAGRAM_ITEM_MUTATION,
      {
        workflowId,
        kind: input.data.kind,
        ...(input.data.title !== undefined ? { title: input.data.title } : {}),
        ...(input.data.schedule !== undefined ? { schedule: input.data.schedule } : {}),
      },
      userId,
    )

    return NextResponse.json({ item: data.createInstagramItem }, { status: 201 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to create Instagram item'
    return NextResponse.json({ message }, { status: 500 })
  }
}
