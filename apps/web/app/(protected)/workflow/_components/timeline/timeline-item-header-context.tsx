'use client'

import { createContext, useContext } from 'react'

import type { TimelineMilestone } from './types'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

export type TimelineItemRunState = 'idle' | 'running' | 'blocked'
export type TimelineItemDeleteState = 'hidden' | 'idle' | 'deleting'

type TimelineItemHeaderContextValue = {
  milestone: TimelineMilestone
  /** When true, the left timeline rail is hidden; status is shown inside the card header. */
  isMobile?: boolean
  runState: TimelineItemRunState
  deleteState: TimelineItemDeleteState
  milestoneRunChatModel: ChatGatewayModelId
  onMilestoneRunChatModelChange: (id: ChatGatewayModelId) => void
  actions: {
    run?: (id: string, chatModel?: ChatGatewayModelId) => void | Promise<void>
    deleteMilestone?: (id: string) => void | Promise<void>
  }
}

const TimelineItemHeaderContext = createContext<TimelineItemHeaderContextValue | null>(null)

export function TimelineItemHeaderProvider({
  value,
  children,
}: {
  value: TimelineItemHeaderContextValue
  children: React.ReactNode
}) {
  return (
    <TimelineItemHeaderContext.Provider value={value}>
      {children}
    </TimelineItemHeaderContext.Provider>
  )
}

export function useTimelineItemHeader() {
  const ctx = useContext(TimelineItemHeaderContext)
  if (!ctx) {
    throw new Error('useTimelineItemHeader must be used within TimelineItemHeaderProvider')
  }
  return ctx
}
