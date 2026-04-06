import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import { CREATE_NODE_MUTATION, parseCreateNodeData, type CreateNodeDataRaw } from '@/lib/graphql/queries'
import { createCampaignSchema } from './schema'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json()
    const { locationId, locationNodeId } = createCampaignSchema.parse(json)

    const data = parseCreateNodeData(
      await graphqlQuery<CreateNodeDataRaw>(
        CREATE_NODE_MUTATION,
        { locationId, nodeType: 'campaign', parentId: locationNodeId },
        userId,
      ),
    )

    const node = data.createNode
    if (!node) {
      return NextResponse.json({ message: 'Failed to create campaign' }, { status: 500 })
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
    const message = error instanceof Error ? error.message : 'Failed to create campaign'
    return NextResponse.json({ message }, { status: 500 })
  }
}
