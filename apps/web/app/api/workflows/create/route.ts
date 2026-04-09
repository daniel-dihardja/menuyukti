import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CREATE_NODE_MUTATION,
  parseCreateNodeData,
  type CreateNodeDataRaw,
} from '@/lib/graphql/queries'
import { createCampaignSchema } from './schema'

export async function POST(req: Request) {
  try {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const { locationId, locationNodeId } = createCampaignSchema.parse(json)

    const data = parseCreateNodeData(
      await graphqlQuery<CreateNodeDataRaw>(
        CREATE_NODE_MUTATION,
        { locationId, nodeType: 'workflow', parentId: locationNodeId },
        userId,
      ),
    )

    const node = data.createNode
    if (!node) {
      return NextResponse.json({ message: 'Failed to create workflow' }, { status: 500 })
    }

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
