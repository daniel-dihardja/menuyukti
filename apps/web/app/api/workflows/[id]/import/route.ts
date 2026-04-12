import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import { revalidateWorkflowCampaignTreeCache } from '@/lib/graphql/revalidate-workflow-tree'
import {
  IMPORT_WORKFLOW_MUTATION,
  NODE_QUERY,
  parseNodeData,
  type ImportWorkflowDataRaw,
  type NodeDataRaw,
} from '@/lib/graphql/queries'

type RouteContext = {
  params: Promise<{ id: string }>
}

const idParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

const bodySchema = z.object({
  payload: z.unknown(),
})

export async function POST(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ message: 'Invalid workflow id' }, { status: 400 })
    }
    const workflowId = idParsed.data

    const json = (await req.json().catch(() => null)) as unknown
    const parsedBody = bodySchema.safeParse(json)
    if (!parsedBody.success) {
      return NextResponse.json({ message: 'Invalid body: payload required' }, { status: 400 })
    }

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

    const data = await graphqlQuery<ImportWorkflowDataRaw>(
      IMPORT_WORKFLOW_MUTATION,
      { locationId: node.locationId, payload: parsedBody.data.payload },
      userId,
    )

    revalidateWorkflowCampaignTreeCache(userId, workflowId)

    return NextResponse.json({ workflow: data.importWorkflow })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to import workflow'
    return NextResponse.json({ message }, { status: 500 })
  }
}
