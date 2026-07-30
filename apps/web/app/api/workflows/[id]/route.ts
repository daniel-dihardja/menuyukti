import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { buildAgentsHeaders } from '@/lib/agents/headers'
import { graphqlQuery } from '@/lib/graphql/client'
import { apiError, apiErrorFromUnknown } from '@/lib/api/error-response'
import { getPythonAgentsUrl } from '@/lib/config'
import { revalidateLocationScopedLists } from '@/lib/graphql/revalidate-location-lists'
import { revalidateWorkflowCampaignTreeCache } from '@/lib/graphql/revalidate-workflow-tree'
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

/** Best-effort: remove LangGraph chat checkpoints for this workflow. */
async function deleteWorkflowChatHistory(userId: string, workflowId: string): Promise<void> {
  const baseUrl = getPythonAgentsUrl()
  const agentsUrl = new URL(`${baseUrl}/chat/history`)
  agentsUrl.searchParams.set('workflow_id', workflowId)
  try {
    const res = await fetch(agentsUrl, {
      method: 'DELETE',
      headers: buildAgentsHeaders(userId),
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(
        `Failed to delete workflow chat history for ${workflowId} (${res.status}): ${text}`,
      )
    }
  } catch (err) {
    console.error(`Failed to delete workflow chat history for ${workflowId}:`, err)
  }
}

type RouteContext = {
  params: Promise<{ id: string }>
}

const idParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return apiError('BAD_REQUEST', 'Invalid workflow id', 400)
    }
    const workflowId = idParsed.data

    const rootData = parseNodeData(
      await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
    )
    const node = rootData.node
    if (!node) {
      return apiError('NOT_FOUND', 'Workflow not found', 404)
    }
    if (node.nodeType !== 'workflow') {
      return apiError('BAD_REQUEST', 'Not a workflow root', 400)
    }

    const json = await req.json()
    const patch = patchWorkflowRootSchema.parse(json)

    const variables: Record<string, unknown> = { id: workflowId, name: patch.name }

    const updated = parseUpdateNodeData(
      await graphqlQuery<UpdateNodeDataRaw>(UPDATE_NODE_MUTATION, variables, userId),
    )

    if (node.locationId != null) {
      revalidateLocationScopedLists(userId, node.locationId)
    }
    revalidateWorkflowCampaignTreeCache(userId, workflowId)

    return NextResponse.json(updated.updateNode)
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to update workflow')
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return apiError('BAD_REQUEST', 'Invalid workflow id', 400)
    }
    const workflowId = idParsed.data

    const rootData = parseNodeData(
      await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, userId),
    )
    const node = rootData.node
    if (!node) {
      return apiError('NOT_FOUND', 'Workflow not found', 404)
    }
    if (node.nodeType !== 'workflow') {
      return apiError('BAD_REQUEST', 'Not a workflow root', 400)
    }

    try {
      const data = await graphqlQuery<DeleteNodeData>(
        DELETE_NODE_MUTATION,
        { id: workflowId },
        userId,
      )
      if (!data.deleteNode) {
        return apiError('INTERNAL_ERROR', 'Failed to delete workflow', 500)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('Unexpected child node type')) {
        return apiError('BAD_REQUEST', msg, 400)
      }
      throw err
    }

    await deleteWorkflowChatHistory(userId, workflowId)

    if (node.locationId != null) {
      revalidateLocationScopedLists(userId, node.locationId)
    }
    revalidateWorkflowCampaignTreeCache(userId, workflowId)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(error)
    return apiErrorFromUnknown(error, 'Failed to delete workflow')
  }
}
