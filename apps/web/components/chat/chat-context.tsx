'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import { createContext, use, useMemo, type ReactNode } from 'react'

import type { PendingMediaAttachment, ChatSlashCommand } from '@/components/chat/chat-types'
import { DEFAULT_CHAT_MODE, type ChatModeId } from '@/lib/chat/chat-modes'
import type { StoryAssetRef } from '@/lib/chat/story-assets-from-messages'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import type { LeonardoPostModelId } from '@/lib/posts/leonardo-post-models'
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

export type ChatComposerState = {
  text: string
  chatMode: ChatModeId
  selectedChatModel: ChatGatewayModelId
  selectedGenerationModel: LeonardoPostModelId
  isSubmitDisabled: boolean
  slashCommands: ChatSlashCommand[]
  pendingMediaAttachments: PendingMediaAttachment[]
  savedStoryAssets: StoryAssetRef[]
}

/** @deprecated Prefer useChatMessages + useChatComposerState */
export type ChatState = ChatMessagesState &
  ChatComposerState & {
    messages: UIMessage[]
  }

export type ChatActions = {
  setText: (value: string) => void
  setChatMode: (mode: ChatModeId) => void
  setSelectedChatModel: (model: ChatGatewayModelId) => void
  setSelectedGenerationModel: (model: LeonardoPostModelId) => void
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
const ChatComposerContext = createContext<ChatComposerState | null>(null)
const ChatActionsContext = createContext<ChatActions | null>(null)

export function ChatProvider({
  children,
  messagesState,
  composerState,
  actions,
}: {
  children: ReactNode
  messagesState: ChatMessagesState
  composerState: ChatComposerState
  actions: ChatActions
}) {
  return (
    <ChatMessagesContext value={messagesState}>
      <ChatComposerContext value={composerState}>
        <ChatActionsContext value={actions}>{children}</ChatActionsContext>
      </ChatComposerContext>
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

/** Status and busy flags for mobile chrome — no message bodies. */
export function useChatMeta(): Pick<
  ChatMessagesState,
  'status' | 'isChatBusy' | 'hasMessages' | 'error'
> {
  const { status, isChatBusy, hasMessages, error } = useChatMessages()
  return useMemo(
    () => ({ status, isChatBusy, hasMessages, error }),
    [status, isChatBusy, hasMessages, error],
  )
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
  return useMemo(
    () => ({
      ...messagesState,
      ...composerState,
      messages: messagesState.visibleMessages,
    }),
    [messagesState, composerState],
  )
}

export { DEFAULT_CHAT_GATEWAY_MODEL, DEFAULT_CHAT_MODE }
