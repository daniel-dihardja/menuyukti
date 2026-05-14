'use client'

import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { useTimelineItemHeader } from './timeline-item-header-context'

export function MilestoneItemMobileRunModel() {
  const { isMobile, actions, milestoneRunChatModel, onMilestoneRunChatModelChange, runState } =
    useTimelineItemHeader()
  const isRunning = runState === 'running'

  if (!isMobile || !actions.run) {
    return null
  }

  return (
    <div
      className="flex min-w-0 items-center justify-end border-border/60 border-b px-3 py-3 md:px-6"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="inline-flex min-w-0 shrink-0">
        <ChatGatewayModelSelect
          disabled={isRunning || runState === 'blocked'}
          onValueChange={onMilestoneRunChatModelChange}
          value={milestoneRunChatModel}
        />
      </span>
    </div>
  )
}
