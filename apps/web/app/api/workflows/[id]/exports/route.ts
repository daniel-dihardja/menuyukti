import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  WORKFLOW_EXPORTS_QUERY,
  NODE_QUERY,
  parseNodeData,
  type WorkflowExportsDataRaw,
  type NodeDataRaw,
} from '@/lib/graphql/queries'

type RouteContext = {
  params: Promise<{ id: string }>
}

const idParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

export async function GET(_req: Request, context: RouteContext) {
  try {
    await connection()
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
    if (node.locationId == null) {
      return NextResponse.json({ message: 'Workflow has no location' }, { status: 400 })
    }

    const data = await graphqlQuery<WorkflowExportsDataRaw>(
      WORKFLOW_EXPORTS_QUERY,
      { locationId: node.locationId },
      userId,
    )

    return NextResponse.json({ exports: data.workflowExports })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to list workflow exports'
    return NextResponse.json({ message }, { status: 500 })
  }
}
