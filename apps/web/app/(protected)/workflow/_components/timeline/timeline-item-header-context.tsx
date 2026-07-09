'use client'

import { createContext, use } from 'react'

import type { TimelineMilestone } from './types'
import type { ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

export type TimelineItemPosition = 'first' | 'middle' | 'last'
export type TimelineItemRunState = 'idle' | 'running' | 'blocked'
export type TimelineItemDeleteState = 'hidden' | 'idle' | 'deleting'

type TimelineItemHeaderContextValue = {
  milestone: TimelineMilestone
  /** When true: tighter header padding, run model select hidden, inline preview below the card. */
  isMobile?: boolean
  position: TimelineItemPosition
  runState: TimelineItemRunState
  deleteState: TimelineItemDeleteState
  movement: {
    moving: boolean
    move?: (id: string, direction: 'up' | 'down') => void | Promise<void>
  }
  milestoneRunChatModel: ChatGatewayModelId
  onMilestoneRunChatModelChange: (id: ChatGatewayModelId) => void
  savingRunChatModel?: boolean
  actions: {
    run?: (id: string, chatModel?: ChatGatewayModelId) => void | Promise<void>
    stopRun?: () => void
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
  return <TimelineItemHeaderContext value={value}>{children}</TimelineItemHeaderContext>
}

export function useTimelineItemHeader() {
  const ctx = use(TimelineItemHeaderContext)
  if (!ctx) {
    throw new Error('useTimelineItemHeader must be used within TimelineItemHeaderProvider')
  }
  return ctx
}
