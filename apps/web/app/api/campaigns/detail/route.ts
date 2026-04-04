import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  CAMPAIGN_BRIEF_QUERY,
  CAMPAIGN_DETAIL_QUERY,
  type CampaignBriefData,
  type CampaignDetailData,
} from '@/lib/graphql/queries'

/**
 * GET /api/campaigns/detail?id=...
 * Returns campaign row + campaign brief from GraphQL (parallel).
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')
    const id = idParam ? Number(idParam) : NaN

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: 'id is required and must be a positive integer' },
        { status: 400 },
      )
    }

    const campaignId = String(id)

    const [campaignData, briefData] = await Promise.all([
      graphqlQuery<CampaignDetailData>(CAMPAIGN_DETAIL_QUERY, { id: campaignId }, userId),
      graphqlQuery<CampaignBriefData>(CAMPAIGN_BRIEF_QUERY, { campaignId }, userId),
    ])

    if (!campaignData.campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({
      campaign: campaignData.campaign,
      campaignBrief: briefData.campaignBrief,
    })
  } catch (err) {
    console.error('Campaign detail failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to load campaign'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
