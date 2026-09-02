'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import { createContext, use, useMemo, type ReactNode } from 'react'

import type { PendingMediaAttachment, ChatSlashCommand } from '@/components/chat/chat-types'
import { DEFAULT_CHAT_MODE, type ChatModeId } from '@/lib/chat/chat-modes'
import type { StoryAssetRef } from '@/lib/chat/story-assets-from-messages'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import type { LeonardoPostModelId } from '@/lib/posts/leonardo-post-models'
import type { ChatImageAssistantFormatId } from '@/lib/posts/leonardo-post-dimensions'
import type { MediaCatalogItem } from '@/lib/media/client-api'
import type { ChatVisualizationId } from '@/lib/chat/visualization-ids'

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'

export type ChatMessagesState = {
  visibleMessages: UIMessage[]
  status: ChatStatus
  error: Error | undefined
  isChatBusy: boolean
  hasMessages: boolean
}

export type ChatMetaState = {
  status: ChatStatus
  isChatBusy: boolean
  hasMessages: boolean
  error: Error | undefined
}

export type ChatComposerState = {
  text: string
  chatMode: ChatModeId
  selectedChatModel: ChatGatewayModelId
  selectedGenerationModel: LeonardoPostModelId
  selectedImageFormat: ChatImageAssistantFormatId
  /** Thread location (venue); used by composer tools such as sales report. */
  locationId: number
  /** Pinned sales report for chart tools; null means no sales data. */
  analyticsRunId: number | null
  isSubmitDisabled: boolean
  slashCommands: ChatSlashCommand[]
  pendingMediaAttachments: PendingMediaAttachment[]
}

export type ChatStoryAssetsState = {
  assets: StoryAssetRef[]
  onRemove: (name: string) => void
}

/** @deprecated Prefer useChatMessages + useChatComposerState */
export type ChatState = ChatMessagesState &
  ChatComposerState & {
    messages: UIMessage[]
    savedStoryAssets: StoryAssetRef[]
  }

export type ChatActions = {
  setText: (value: string) => void
  setChatMode: (mode: ChatModeId) => void
  setSelectedChatModel: (model: ChatGatewayModelId) => void
  setSelectedGenerationModel: (model: LeonardoPostModelId) => void
  setSelectedImageFormat: (format: ChatImageAssistantFormatId) => void
  setAnalyticsRunId: (analyticsRunId: number | null) => void
  handleTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (message: PromptInputMessage) => Promise<void>
  /** Send a short text-only user message (e.g. Story Generate / Change confirm buttons). */
  sendQuickReply: (text: string) => Promise<void>
  handleSelectSlashCommand: (command: string) => Promise<void>
  handleSelectVisualizationMention: (visualizationId: ChatVisualizationId, title: string) => void
  handleSelectMediaMention: (item: MediaCatalogItem) => void
  handleRemovePendingMedia: (id: string) => void
  handleRemoveSavedStoryAsset: (name: string) => void
  handleRetry: () => Promise<void>
  handleClearChat: () => void
  stop: () => void
}

const ChatMessagesContext = createContext<ChatMessagesState | null>(null)
const ChatMetaContext = createContext<ChatMetaState | null>(null)
const ChatComposerContext = createContext<ChatComposerState | null>(null)
const ChatStoryAssetsContext = createContext<ChatStoryAssetsState | null>(null)
const ChatActionsContext = createContext<ChatActions | null>(null)

export function ChatProvider({
  children,
  messagesState,
  metaState,
  composerState,
  storyAssetsState,
  actions,
}: {
  children: ReactNode
  messagesState: ChatMessagesState
  metaState: ChatMetaState
  composerState: ChatComposerState
  storyAssetsState: ChatStoryAssetsState
  actions: ChatActions
}) {
  return (
    <ChatMessagesContext value={messagesState}>
      <ChatMetaContext value={metaState}>
        <ChatComposerContext value={composerState}>
          <ChatStoryAssetsContext value={storyAssetsState}>
            <ChatActionsContext value={actions}>{children}</ChatActionsContext>
          </ChatStoryAssetsContext>
        </ChatComposerContext>
      </ChatMetaContext>
    </ChatMessagesContext>
  )
}

export function useChatMessages(): ChatMessagesState {
  const ctx = use(ChatMessagesContext)
  if (!ctx) {
    throw new Error('useChatMessages must be used within ChatProvider')
  }
  return ctx
}

export function useChatComposerState(): ChatComposerState {
  const ctx = use(ChatComposerContext)
  if (!ctx) {
    throw new Error('useChatComposerState must be used within ChatProvider')
  }
  return ctx
}

/** Status and busy flags — does not subscribe to message bodies. */
export function useChatMeta(): ChatMetaState {
  const ctx = use(ChatMetaContext)
  if (!ctx) {
    throw new Error('useChatMeta must be used within ChatProvider')
  }
  return ctx
}

export function useChatStoryAssets(): ChatStoryAssetsState {
  const ctx = use(ChatStoryAssetsContext)
  if (!ctx) {
    throw new Error('useChatStoryAssets must be used within ChatProvider')
  }
  return ctx
}

export function useChatActions(): ChatActions {
  const ctx = use(ChatActionsContext)
  if (!ctx) {
    throw new Error('useChatActions must be used within ChatProvider')
  }
  return ctx
}

/** Convenience hook combining messages + composer slices. */
export function useChatState(): ChatState {
  const messagesState = useChatMessages()
  const composerState = useChatComposerState()
  const { assets: savedStoryAssets } = useChatStoryAssets()
  return useMemo(
    () => ({
      ...messagesState,
      ...composerState,
      savedStoryAssets,
      messages: messagesState.visibleMessages,
    }),
    [messagesState, composerState, savedStoryAssets],
  )
}

export { DEFAULT_CHAT_GATEWAY_MODEL, DEFAULT_CHAT_MODE }
