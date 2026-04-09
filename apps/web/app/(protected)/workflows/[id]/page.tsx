export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { routes } from '@/lib/routes'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  NODE_QUERY,
  NODES_QUERY,
  parseNodeData,
  parseNodesData,
  type WorkflowNode,
  type NodeDataRaw,
  type NodesDataRaw,
} from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { CampaignWorkspace } from '../_components/campaign-workspace'
import { milestoneNodeToTimelineMilestone } from '../_components/milestone-map'
import type { MilestoneNodeDto } from '../_components/milestone-map'
import type { TimelineMilestone } from '../_components/timeline-workspace'

const workflowIdParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params
  const parsed = workflowIdParamSchema.safeParse(rawId)
  if (!parsed.success) {
    return { title: 'Workflow' }
  }
  const tChat = await getTranslations('analytics.campaigns.chat')
  const shortId = parsed.data.slice(0, 8)
  const title = tChat('pageTitle', { id: shortId })
  return { title }
}

export default async function Page({ params }: PageProps) {
  const { isAuthenticated, userId: authUserId } = await auth()
  if (!isAuthenticated || !authUserId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const { id: rawId } = await params
  const parsed = workflowIdParamSchema.safeParse(rawId)
  if (!parsed.success) {
    notFound()
  }
  const workflowId = parsed.data

  const nodeData = parseNodeData(
    await graphqlQuery<NodeDataRaw>(NODE_QUERY, { id: workflowId }, authUserId),
  )
  const campaignNodeRaw = nodeData.node
  if (!campaignNodeRaw || campaignNodeRaw.nodeType !== 'workflow') {
    notFound()
  }
  const campaignNode = campaignNodeRaw as WorkflowNode
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
        parentId: workflowId,
      },
      authUserId,
    ),
  )

  const initialMilestones: TimelineMilestone[] = await Promise.all(
    milestonesData.nodes.map(async (n) => {
      const [passCriteriaChildren, goalChildren, milestonedataChildren, resultChildren] =
        await Promise.all([
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
          graphqlQuery<NodesDataRaw>(
            NODES_QUERY,
            {
              locationId,
              nodeType: 'result',
              parentId: n.id,
            },
            authUserId,
          ),
        ])
      const passCriteriaParsed = parseNodesData(passCriteriaChildren)
      const goalParsed = parseNodesData(goalChildren)
      const milestonedataParsed = parseNodesData(milestonedataChildren)
      const resultParsed = parseNodesData(resultChildren)
      const dto: MilestoneNodeDto = {
        id: n.id,
        name: n.name,
        data: n.data,
        passCriteriaNodes: passCriteriaParsed.nodes,
        goalNodes: goalParsed.nodes,
        milestonedataNodes: milestonedataParsed.nodes,
        resultNodes: resultParsed.nodes,
      }
      return milestoneNodeToTimelineMilestone(dto)
    }),
  )

  const tCampaigns = await getTranslations('analytics.campaigns')
  const tChat = await getTranslations('analytics.campaigns.chat')
  const title = tChat('pageTitle', { id: workflowId.slice(0, 8) })

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[{ label: tCampaigns('title'), href: routes.workflows.list }, { label: title }]}
      mainClassName="max-w-none flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <CampaignWorkspace
        initialGoal={campaignNode.data?.goal ?? null}
        initialMilestones={initialMilestones}
        locationId={locationId}
        workflowId={workflowId}
      />
    </AnalyticsPageShell>
  )
}
