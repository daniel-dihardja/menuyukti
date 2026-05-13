'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

import type { TimelineMilestone } from './timeline-workspace'

const WorkflowChatPanel = dynamic(
  () => import('./workflow-chat-panel').then((m) => m.WorkflowChatPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(420px,50vh)] min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed">
        <Skeleton className="h-10 w-56" />
      </div>
    ),
  },
)

export type WorkflowWorkspaceProps = {
  workflowId: string
  locationId: number
  analyticsRunId: number | null
  initialMilestones: TimelineMilestone[]
}

export function WorkflowWorkspace({
  workflowId,
  locationId,
  analyticsRunId,
  initialMilestones,
}: WorkflowWorkspaceProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1">
        <WorkflowChatPanel
          analyticsRunId={analyticsRunId}
          initialMilestones={initialMilestones}
          locationId={locationId}
          workflowId={workflowId}
        />
      </div>
    </div>
  )
}
