import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { routes } from '@/lib/routes'
import { parseNode } from '@/lib/graphql/node-schemas'
import type { MilestoneNode } from '@/lib/graphql/node-schemas'
import { getCachedWorkflowCampaignTree } from '@/lib/graphql/cached-queries'
import type { WorkflowNode } from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'

import { CampaignWorkspace } from '../_components/campaign-workspace'
import { milestoneNodeToTimelineMilestone } from '../_components/milestone-map'
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

  const treeRaw = await getCachedWorkflowCampaignTree(authUserId, workflowId)
  const tree = treeRaw.workflowCampaignTree
  if (!tree) {
    notFound()
  }

  const campaignNodeRaw = parseNode(tree.workflow)
  if (campaignNodeRaw.nodeType !== 'workflow') {
    notFound()
  }
  const campaignNode = campaignNodeRaw as WorkflowNode
  const locationId = campaignNode.locationId
  if (locationId == null) {
    notFound()
  }

  const initialMilestones: TimelineMilestone[] = tree.milestones.map((bundle) => {
    const m = parseNode(bundle.milestone)
    if (m.nodeType !== 'milestone') {
      throw new Error('Invariant: expected milestone node in campaign tree')
    }
    return milestoneNodeToTimelineMilestone(m as MilestoneNode)
  })

  const tCampaigns = await getTranslations('analytics.campaigns')
  const tChat = await getTranslations('analytics.campaigns.chat')
  const title = tChat('pageTitle', { id: workflowId.slice(0, 8) })

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[{ label: tCampaigns('title'), href: routes.workflows.list }, { label: title }]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <CampaignWorkspace
        initialMilestones={initialMilestones}
        locationId={locationId}
        workflowId={workflowId}
      />
    </AnalyticsPageShell>
  )
}
