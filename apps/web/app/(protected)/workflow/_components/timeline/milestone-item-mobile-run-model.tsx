'use client'

import { ChatGatewayModelSelect } from '@/components/chat-gateway-model-select'
import { Separator } from '@workspace/ui/components/separator'

import { useTimelineItemHeader } from './timeline-item-header-context'

export function MilestoneItemMobileRunModel() {
  const {
    isMobile,
    actions,
    milestoneRunChatModel,
    onMilestoneRunChatModelChange,
    runState,
    savingRunChatModel = false,
  } = useTimelineItemHeader()
  const isRunning = runState === 'running'

  if (!isMobile || !actions.run) {
    return null
  }

  return (
    <>
      <Separator />
      <div
        className="flex w-full min-w-0 px-3 py-3 md:px-6"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ChatGatewayModelSelect
          className="w-full max-w-none"
          disabled={isRunning || runState === 'blocked' || savingRunChatModel}
          onValueChange={onMilestoneRunChatModelChange}
          value={milestoneRunChatModel}
        />
      </div>
    </>
  )
}
