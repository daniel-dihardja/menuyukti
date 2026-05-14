import { NextResponse, connection } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_NODE_MUTATION,
  CREATE_WORKFLOW_FROM_PAYLOAD_MUTATION,
  parseCreateNodeData,
  parseCreateWorkflowFromPayloadData,
  type CreateNodeDataRaw,
  type CreateWorkflowFromPayloadDataRaw,
} from '@/lib/graphql/queries'
import { revalidateLocationScopedLists } from '@/lib/graphql/revalidate-location-lists'
import { createCampaignSchema } from './schema'

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const { locationId, analyticsRunId, templatePayload } = createCampaignSchema.parse(json)

    if (templatePayload !== undefined) {
      const data = parseCreateWorkflowFromPayloadData(
        await graphqlQuery<CreateWorkflowFromPayloadDataRaw>(
          CREATE_WORKFLOW_FROM_PAYLOAD_MUTATION,
          {
            locationId,
            payload: templatePayload,
            analyticsRunId: analyticsRunId ?? null,
          },
          userId,
        ),
      )
      const node = data.createWorkflowFromPayload
      if (!node) {
        return NextResponse.json({ message: 'Failed to create workflow' }, { status: 500 })
      }
      revalidateLocationScopedLists(userId, locationId)
      return NextResponse.json(node, { status: 201 })
    }

    const data = parseCreateNodeData(
      await graphqlQuery<CreateNodeDataRaw>(
        CREATE_NODE_MUTATION,
        {
          locationId,
          nodeType: 'workflow',
          parentId: null,
          data: analyticsRunId !== undefined ? { analyticsRunId } : undefined,
        },
        userId,
      ),
    )

    const node = data.createNode
    if (!node) {
      return NextResponse.json({ message: 'Failed to create workflow' }, { status: 500 })
    }

    revalidateLocationScopedLists(userId, locationId)

    return NextResponse.json(node, { status: 201 })
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
    const message = error instanceof Error ? error.message : 'Failed to create workflow'
    return NextResponse.json({ message }, { status: 500 })
  }
}
