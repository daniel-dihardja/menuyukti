export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { routes } from '@/lib/routes'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  NODE_QUERY,
  NODES_QUERY,
  parseNodeData,
  parseNodesData,
  type NodeDataRaw,
  type NodesDataRaw,
} from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { CampaignChatPanel } from '../_components/campaign-chat-panel'
import { milestoneNodeToTimelineMilestone } from '../_components/milestone-map'
import type { MilestoneNodeDto } from '../_components/milestone-map'
import type { TimelineMilestone } from '../_components/timeline-workspace'

const campaignIdParamSchema = z.string().regex(/^\d+$/, 'Invalid campaign id')

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params
  const parsed = campaignIdParamSchema.safeParse(rawId)
  if (!parsed.success) {
    return { title: 'Campaign' }
  }
  const tChat = await getTranslations('analytics.campaigns.chat')
  const shortId = parsed.data.slice(0, 8)
  const title = tChat('pageTitle', { id: shortId })
  return { title }
}

export default async function Page({ params }: PageProps) {
  const { userId: authUserId } = await auth()
  if (!authUserId) {
    redirect(routes.login)
  }

  const { id: rawId } = await params
  const parsed = campaignIdParamSchema.safeParse(rawId)
  if (!parsed.success) {
    notFound()
  }
  const campaignId = parsed.data

  const nodeData = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: campaignId }, authUserId),
  )
  const campaignNode = nodeData.node
  if (!campaignNode || campaignNode.nodeType !== 'campaign') {
    notFound()
  }
  const locationId = campaignNode.locationId
  if (locationId == null) {
    notFound()
  }

  const milestonesData = parseNodesData(
    await graphqlQuery<NodesDataRaw>(
      NODES_QUERY,
      {
        locationId,
        nodeType: 'milestone',
        parentId: campaignId,
      },
      authUserId,
    ),
  )

  const initialMilestones: TimelineMilestone[] = await Promise.all(
    milestonesData.nodes.map(async (n) => {
      const [passCriteriaChildren, goalChildren, milestonedataChildren] = await Promise.all([
        graphqlQuery<NodesDataRaw>(
          NODES_QUERY,
          {
            locationId,
            nodeType: 'passcriteria',
            parentId: n.id,
          },
          authUserId,
        ),
        graphqlQuery<NodesDataRaw>(
          NODES_QUERY,
          {
            locationId,
            nodeType: 'goal',
            parentId: n.id,
          },
          authUserId,
        ),
        graphqlQuery<NodesDataRaw>(
          NODES_QUERY,
          {
            locationId,
            nodeType: 'milestonedata',
            parentId: n.id,
          },
          authUserId,
        ),
      ])
      const passCriteriaParsed = parseNodesData(passCriteriaChildren)
      const goalParsed = parseNodesData(goalChildren)
      const milestonedataParsed = parseNodesData(milestonedataChildren)
      const dto: MilestoneNodeDto = {
        id: n.id,
        name: n.name,
        data: n.data,
        passCriteriaNodes: passCriteriaParsed.nodes,
        goalNodes: goalParsed.nodes,
        milestonedataNodes: milestonedataParsed.nodes,
      }
      return milestoneNodeToTimelineMilestone(dto)
    }),
  )

  const tCampaigns = await getTranslations('analytics.campaigns')
  const tChat = await getTranslations('analytics.campaigns.chat')
  const title = tChat('pageTitle', { id: campaignId.slice(0, 8) })

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[{ label: tCampaigns('title'), href: routes.campaigns.list }, { label: title }]}
      mainClassName="max-w-none flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <CampaignChatPanel campaignId={campaignId} initialMilestones={initialMilestones} />
    </AnalyticsPageShell>
  )
}
