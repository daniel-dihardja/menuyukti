import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZodError, z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  NODE_QUERY,
  UPDATE_NODE_MUTATION,
  parseNodeData,
  parseUpdateNodeData,
  type NodeDataRaw,
  type UpdateNodeDataRaw,
} from '@/lib/graphql/queries'
import { patchCampaignSchema } from './schema'

type RouteContext = {
  params: Promise<{ id: string }>
}

const idParamSchema = z.string().regex(/^\d+$/, 'Invalid campaign id')

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await context.params
    const idParsed = idParamSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ message: 'Invalid campaign id' }, { status: 400 })
    }
    const campaignId = idParsed.data

    const campaignData = parseNodeData(
      await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: campaignId }, userId),
    )
    const node = campaignData.node
    if (!node) {
      return NextResponse.json({ message: 'Campaign not found' }, { status: 404 })
    }
    if (node.nodeType !== 'campaign') {
      return NextResponse.json({ message: 'Not a campaign' }, { status: 400 })
    }

    const json = await req.json()
    const patch = patchCampaignSchema.parse(json)

    const variables: Record<string, unknown> = { id: campaignId }
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
    const message = error instanceof Error ? error.message : 'Failed to update campaign'
    return NextResponse.json({ message }, { status: 500 })
  }
}
