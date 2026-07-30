'use client'

import dynamic from 'next/dynamic'

import { WorkflowWorkspaceSkeleton } from './workflow-workspace-skeleton'

const WorkflowChatPanel = dynamic(
  () => import('./workflow-chat-panel').then((m) => m.WorkflowChatPanel),
  {
    ssr: false,
    loading: () => <WorkflowWorkspaceSkeleton className="min-h-[min(420px,50vh)] flex-1" />,
  },
)

export type WorkflowWorkspaceProps = {
  workflowId: string
  locationId: number
  analyticsRunId: number | null
}

export function WorkflowWorkspace({
  workflowId,
  locationId,
  analyticsRunId,
}: WorkflowWorkspaceProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1">
        <WorkflowChatPanel
          analyticsRunId={analyticsRunId}
          locationId={locationId}
          workflowId={workflowId}
        />
      </div>
    </div>
  )
}
