import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  DELETE_NODE_MUTATION,
  NODE_QUERY,
  UPDATE_NODE_MUTATION,
  parseNodeData,
  parseUpdateNodeData,
  type DeleteNodeData,
  type NodeDataRaw,
  type UpdateNodeDataRaw,
} from '@/lib/graphql/queries'
import { patchWorkflowRootSchema } from './schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

const idParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ message: 'Invalid workflow id' }, { status: 400 })
    }
    const workflowId = idParsed.data

    const rootData = parseNodeData(
      await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
    )
    const node = rootData.node
    if (!node) {
      return NextResponse.json({ message: 'Workflow not found' }, { status: 404 })
    }
    if (node.nodeType !== 'workflow') {
      return NextResponse.json({ message: 'Not a workflow root' }, { status: 400 })
    }

    const json = await req.json()
    const patch = patchWorkflowRootSchema.parse(json)

    const variables: Record<string, unknown> = { id: workflowId }
    if (patch.name !== undefined) {
      variables.name = patch.name
    }
    if (patch.goal !== undefined) {
      variables.data = { goal: patch.goal }
    }

    const updated = parseUpdateNodeData(
      await graphqlQuery<UpdateNodeDataRaw>(UPDATE_NODE_MUTATION, variables, userId),
    )

    return NextResponse.json(updated.updateNode)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: 'Invalid input',
          issues: error.issues,
        },
        { status: 400 },
      )
    }

    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to update workflow'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ message: 'Invalid workflow id' }, { status: 400 })
    }
    const workflowId = idParsed.data

    const rootData = parseNodeData(
      await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
    )
    const node = rootData.node
    if (!node) {
      return NextResponse.json({ message: 'Workflow not found' }, { status: 404 })
    }
    if (node.nodeType !== 'workflow') {
      return NextResponse.json({ message: 'Not a workflow root' }, { status: 400 })
    }

    try {
      const data = await graphqlQuery<DeleteNodeData>(
        DELETE_NODE_MUTATION,
        { id: workflowId },
        userId,
      )
      if (!data.deleteNode) {
        return NextResponse.json({ message: 'Failed to delete workflow' }, { status: 500 })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('Unexpected child node type')) {
        return NextResponse.json({ message: msg }, { status: 400 })
      }
      throw err
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to delete workflow'
    return NextResponse.json({ message }, { status: 500 })
  }
}
