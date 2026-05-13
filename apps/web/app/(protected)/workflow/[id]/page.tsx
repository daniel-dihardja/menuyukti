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

import { WorkflowWorkspace } from '../_components/workflow-workspace'
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
  const workflowId = parsed.data
  const { userId } = await auth()
  if (userId) {
    const treeRaw = await getCachedWorkflowCampaignTree(userId, workflowId)
    const tree = treeRaw.workflowCampaignTree
    if (tree) {
      const workflowNodeRaw = parseNode(tree.workflow)
      if (workflowNodeRaw.nodeType === 'workflow') {
        const name = (workflowNodeRaw as WorkflowNode).name.trim()
        if (name.length > 0) {
          return { title: name }
        }
      }
    }
  }
  const tChat = await getTranslations('analytics.workflows.chat')
  return { title: tChat('pageTitle', { id: workflowId.slice(0, 8) }) }
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

  const workflowNodeRaw = parseNode(tree.workflow)
  if (workflowNodeRaw.nodeType !== 'workflow') {
    notFound()
  }
  const workflowNode = workflowNodeRaw as WorkflowNode
  const locationId = workflowNode.locationId
  if (locationId == null) {
    notFound()
  }
  const analyticsRunId =
    typeof workflowNode.data?.analyticsRunId === 'number' &&
    Number.isInteger(workflowNode.data.analyticsRunId)
      ? workflowNode.data.analyticsRunId
      : null

  const initialMilestones: TimelineMilestone[] = tree.milestones.map((bundle) => {
    const m = parseNode(bundle.milestone)
    if (m.nodeType !== 'milestone') {
      throw new Error('Invariant: expected milestone node in workflow tree')
    }
    return milestoneNodeToTimelineMilestone(m as MilestoneNode)
  })

  const tWorkflows = await getTranslations('analytics.workflows')
  const tChat = await getTranslations('analytics.workflows.chat')
  const fallbackTitle = tChat('pageTitle', { id: workflowId.slice(0, 8) })
  const workflowDisplayName =
    workflowNode.name.trim().length > 0 ? workflowNode.name.trim() : fallbackTitle

  return (
    <AnalyticsPageShell
      title={workflowDisplayName}
      breadcrumbs={[
        { label: tWorkflows('title'), href: routes.workflows.list },
        { label: workflowDisplayName },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <WorkflowWorkspace
        analyticsRunId={analyticsRunId}
        initialMilestones={initialMilestones}
        locationId={locationId}
        workflowId={workflowId}
      />
    </AnalyticsPageShell>
  )
}
