'use client'

import { createContext, use, type ReactNode } from 'react'

import { useChatVisualizations } from '@/components/chat/use-chat-visualizations'
import type { ChatVisualizationId } from './chat-visualization-catalog'

export type ChatVisualizationsContextValue = {
  addedIds: ChatVisualizationId[]
  addVisualization: (id: ChatVisualizationId) => void
  removeVisualization: (id: ChatVisualizationId) => void
  hydrated: boolean
  locationId: number
  analyticsRunId: number | null
}

const ChatVisualizationsContext = createContext<ChatVisualizationsContextValue | null>(null)

export function ChatVisualizationsProvider({
  storageKeyId,
  locationId,
  analyticsRunId,
  children,
}: {
  /** Persistence key (`agentThreadId`). */
  storageKeyId: string
  locationId: number
  analyticsRunId: number | null
  children: ReactNode
}) {
  const visualizations = useChatVisualizations(storageKeyId)
  const value: ChatVisualizationsContextValue = {
    ...visualizations,
    locationId,
    analyticsRunId,
  }
  return <ChatVisualizationsContext value={value}>{children}</ChatVisualizationsContext>
}

export function useChatVisualizationsState(): ChatVisualizationsContextValue {
  const ctx = use(ChatVisualizationsContext)
  if (!ctx) {
    throw new Error('useChatVisualizationsState must be used within ChatVisualizationsProvider')
  }
  return ctx
}
