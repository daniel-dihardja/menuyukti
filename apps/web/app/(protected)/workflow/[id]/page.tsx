import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { z } from 'zod'
import { routes } from '@/lib/routes'
import { parseNode } from '@/lib/graphql/node-schemas'
import type { MilestoneNode } from '@/lib/graphql/node-schemas'
import { getCachedWorkflowCampaignTree } from '@/lib/graphql/cached-queries'
import type { WorkflowNode } from '@/lib/graphql/queries'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { WorkflowWorkspace } from '../_components/workflow-workspace'
import { milestoneNodeToTimelineMilestone } from '../_components/milestone-map'
import type { TimelineMilestone } from '../_components/timeline-workspace'
import { parseWorkflowAnalyticsRunId } from '@/lib/workflows/parse-workflow-analytics-run-id'

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

function WorkflowDetailSkeleton() {
  return (
    <div className="flex min-h-[24rem] flex-col gap-4">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="min-h-[20rem] flex-1 rounded-lg" />
    </div>
  )
}

async function WorkflowDetailContent({
  workflowId,
  userId,
}: {
  workflowId: string
  userId: string
}) {
  const treeRaw = await getCachedWorkflowCampaignTree(userId, workflowId)
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
  const analyticsRunId = parseWorkflowAnalyticsRunId(workflowNode.data)

  const initialMilestones: TimelineMilestone[] = tree.milestones.map((bundle) => {
    const m = parseNode(bundle.milestone)
    if (m.nodeType !== 'milestone') {
      throw new Error('Invariant: expected milestone node in workflow tree')
    }
    return milestoneNodeToTimelineMilestone(m as MilestoneNode)
  })

  return (
    <WorkflowWorkspace
      analyticsRunId={analyticsRunId}
      initialMilestones={initialMilestones}
      locationId={locationId}
      workflowId={workflowId}
    />
  )
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

  const tWorkflows = await getTranslations('analytics.workflows')
  const tChat = await getTranslations('analytics.workflows.chat')
  const fallbackTitle = tChat('pageTitle', { id: workflowId.slice(0, 8) })

  return (
    <AnalyticsPageShell
      title={fallbackTitle}
      breadcrumbs={[
        { label: tWorkflows('title'), href: routes.workflows.list },
        { label: fallbackTitle },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <Suspense fallback={<WorkflowDetailSkeleton />}>
        <WorkflowDetailContent workflowId={workflowId} userId={authUserId} />
      </Suspense>
    </AnalyticsPageShell>
  )
}
