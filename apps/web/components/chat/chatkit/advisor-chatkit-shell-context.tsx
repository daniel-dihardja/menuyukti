'use client'

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'

import { DEFAULT_CHAT_MODE, type ChatModeId } from '@/lib/chat/chat-modes'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import {
  DEFAULT_CHAT_IMAGE_ASSISTANT_FORMAT,
  type ChatImageAssistantFormatId,
} from '@/lib/posts/leonardo-post-dimensions'

export type AdvisorChatKitShellState = {
  agentThreadId: string
  locationId: number
  analyticsRunId: number | null
  setAnalyticsRunId: (id: number | null) => void
  chatMode: ChatModeId
  setChatMode: (mode: ChatModeId) => void
  selectedChatModel: ChatGatewayModelId
  setSelectedChatModel: (model: ChatGatewayModelId) => void
  selectedGenerationModel: LeonardoPostModelId
  setSelectedGenerationModel: (model: LeonardoPostModelId) => void
  selectedImageFormat: ChatImageAssistantFormatId
  setSelectedImageFormat: (format: ChatImageAssistantFormatId) => void
  latestStoryImageUrl: string | null
  setLatestStoryImageUrl: (url: string | null) => void
  onThreadRotated?: (nextThreadId: string) => void
}

const AdvisorChatKitShellContext = createContext<AdvisorChatKitShellState | null>(null)

export type AdvisorChatKitShellProviderProps = {
  agentThreadId: string
  locationId: number
  analyticsRunId: number | null
  onAnalyticsRunIdChange: (analyticsRunId: number | null) => void
  onThreadRotated?: (nextThreadId: string) => void
  children: ReactNode
}

export function AdvisorChatKitShellProvider({
  agentThreadId,
  locationId,
  analyticsRunId,
  onAnalyticsRunIdChange,
  onThreadRotated,
  children,
}: AdvisorChatKitShellProviderProps) {
  const [chatMode, setChatMode] = useState<ChatModeId>(DEFAULT_CHAT_MODE)
  const [selectedChatModel, setSelectedChatModel] = useState<ChatGatewayModelId>(
    DEFAULT_CHAT_GATEWAY_MODEL,
  )
  const [selectedGenerationModel, setSelectedGenerationModel] = useState<LeonardoPostModelId>(
    DEFAULT_LEONARDO_POST_MODEL,
  )
  const [selectedImageFormat, setSelectedImageFormat] = useState<ChatImageAssistantFormatId>(
    DEFAULT_CHAT_IMAGE_ASSISTANT_FORMAT,
  )
  const [latestStoryImageUrl, setLatestStoryImageUrl] = useState<string | null>(null)

  const setAnalyticsRunId = useCallback(
    (id: number | null) => {
      onAnalyticsRunIdChange(id)
    },
    [onAnalyticsRunIdChange],
  )

  const value = useMemo<AdvisorChatKitShellState>(
    () => ({
      agentThreadId,
      locationId,
      analyticsRunId,
      setAnalyticsRunId,
      chatMode,
      setChatMode,
      selectedChatModel,
      setSelectedChatModel,
      selectedGenerationModel,
      setSelectedGenerationModel,
      selectedImageFormat,
      setSelectedImageFormat,
      latestStoryImageUrl,
      setLatestStoryImageUrl,
      onThreadRotated,
    }),
    [
      agentThreadId,
      locationId,
      analyticsRunId,
      setAnalyticsRunId,
      chatMode,
      selectedChatModel,
      selectedGenerationModel,
      selectedImageFormat,
      latestStoryImageUrl,
      onThreadRotated,
    ],
  )

  return <AdvisorChatKitShellContext value={value}>{children}</AdvisorChatKitShellContext>
}

export function useAdvisorChatKitShell(): AdvisorChatKitShellState {
  const value = use(AdvisorChatKitShellContext)
  if (!value) {
    throw new Error('useAdvisorChatKitShell must be used within AdvisorChatKitShellProvider')
  }
  return value
}
