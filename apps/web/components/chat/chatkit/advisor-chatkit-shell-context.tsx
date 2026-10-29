'use client'

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  coerceEnabledChatMode,
  DEFAULT_CHAT_MODE,
  isChatModeEnabled,
  type ChatModeId,
} from '@/lib/chat/chat-modes'
import {
  defaultAdvisorWorkspaceTab,
  type AdvisorWorkspaceTabId,
} from '@/lib/chat/advisor-workspace-tabs'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import {
  DEFAULT_LEONARDO_POST_MODEL,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import {
  DEFAULT_CHAT_IMAGE_ASSISTANT_FORMAT,
  type ChatImageAssistantFormatId,
} from '@/lib/posts/leonardo-post-dimensions'

export type AdvisorBranchOption = {
  id: number
  name: string
}

export type AdvisorChatKitShellState = {
  agentThreadId: string
  locationId: number
  setLocationId: (id: number) => void
  analyticsRunId: number | null
  setAnalyticsRunId: (id: number | null) => void
  branches: AdvisorBranchOption[]
  workspaceTab: AdvisorWorkspaceTabId
  setWorkspaceTab: (tab: AdvisorWorkspaceTabId) => void
  openMobileWorkspace: () => void
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
  onLocationIdChange: (locationId: number) => void
  analyticsRunId: number | null
  onAnalyticsRunIdChange: (analyticsRunId: number | null) => void
  branches: AdvisorBranchOption[]
  onOpenMobileWorkspace?: () => void
  onThreadRotated?: (nextThreadId: string) => void
  children: ReactNode
}

export function AdvisorChatKitShellProvider({
  agentThreadId,
  locationId,
  onLocationIdChange,
  analyticsRunId,
  onAnalyticsRunIdChange,
  branches,
  onOpenMobileWorkspace,
  onThreadRotated,
  children,
}: AdvisorChatKitShellProviderProps) {
  const [chatMode, setChatModeState] = useState<ChatModeId>(DEFAULT_CHAT_MODE)
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
  const [workspaceTab, setWorkspaceTabState] = useState<AdvisorWorkspaceTabId>('insights')

  const setChatMode = useCallback((mode: ChatModeId) => {
    setChatModeState(isChatModeEnabled(mode) ? mode : DEFAULT_CHAT_MODE)
  }, [])

  const setAnalyticsRunId = useCallback(
    (id: number | null) => {
      onAnalyticsRunIdChange(id)
    },
    [onAnalyticsRunIdChange],
  )

  const setLocationId = useCallback(
    (id: number) => {
      onLocationIdChange(id)
    },
    [onLocationIdChange],
  )

  const effectiveChatMode = coerceEnabledChatMode(chatMode)

  useEffect(() => {
    setWorkspaceTabState(defaultAdvisorWorkspaceTab(effectiveChatMode))
  }, [effectiveChatMode])

  const setWorkspaceTab = useCallback((tab: AdvisorWorkspaceTabId) => {
    setWorkspaceTabState(tab)
  }, [])

  const openMobileWorkspace = useCallback(() => {
    onOpenMobileWorkspace?.()
  }, [onOpenMobileWorkspace])

  const value = useMemo<AdvisorChatKitShellState>(
    () => ({
      agentThreadId,
      locationId,
      setLocationId,
      analyticsRunId,
      setAnalyticsRunId,
      branches,
      workspaceTab,
      setWorkspaceTab,
      openMobileWorkspace,
      chatMode: effectiveChatMode,
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
      setLocationId,
      analyticsRunId,
      setAnalyticsRunId,
      branches,
      workspaceTab,
      setWorkspaceTab,
      openMobileWorkspace,
      effectiveChatMode,
      setChatMode,
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
