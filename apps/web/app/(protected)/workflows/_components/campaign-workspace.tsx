'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@workspace/ui/components/skeleton'

import type { TimelineMilestone } from './timeline-workspace'

const CampaignChatPanel = dynamic(
  () => import('./campaign-chat-panel').then((m) => m.CampaignChatPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(420px,50vh)] min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed">
        <Skeleton className="h-10 w-56" />
      </div>
    ),
  },
)

export type CampaignWorkspaceProps = {
  workflowId: string
  locationId: number
  initialMilestones: TimelineMilestone[]
}

export function CampaignWorkspace({
  workflowId,
  locationId,
  initialMilestones,
}: CampaignWorkspaceProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1">
        <CampaignChatPanel
          initialMilestones={initialMilestones}
          locationId={locationId}
          workflowId={workflowId}
        />
      </div>
    </div>
  )
}
