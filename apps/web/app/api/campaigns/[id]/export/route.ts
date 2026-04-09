import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  EXPORT_CAMPAIGN_MUTATION,
  NODE_QUERY,
  parseNodeData,
  type ExportCampaignDataRaw,
  type NodeDataRaw,
} from '@/lib/graphql/queries'

type RouteContext = {
  params: Promise<{ id: string }>
}

const idParamSchema = z.string().regex(/^\d+$/, 'Invalid campaign id')

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    if (node.locationId == null) {
      return NextResponse.json({ message: 'Campaign has no location' }, { status: 400 })
    }

    const data = await graphqlQuery<ExportCampaignDataRaw>(
      EXPORT_CAMPAIGN_MUTATION,
      { campaignId, locationId: node.locationId },
      userId,
    )

    return NextResponse.json(data.exportCampaign)
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to export campaign'
    return NextResponse.json({ message }, { status: 500 })
  }
}
