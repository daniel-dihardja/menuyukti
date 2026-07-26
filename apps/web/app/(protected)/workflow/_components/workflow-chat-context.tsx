'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import { createContext, use, useMemo, type ReactNode } from 'react'

import type { PendingMediaAttachment, WorkflowChatSlashCommand } from './use-workflow-chat'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'
import type { MediaCatalogItem } from '@/lib/media/client-api'
import type { WorkflowVisualizationId } from '@/lib/workflow/workflow-visualization-ids'

export type WorkflowChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'

export type WorkflowChatMessagesState = {
  visibleMessages: UIMessage[]
  status: WorkflowChatStatus
  error: Error | undefined
  isChatBusy: boolean
  hasMessages: boolean
}

export type WorkflowChatComposerState = {
  text: string
  selectedChatModel: ChatGatewayModelId
  isSubmitDisabled: boolean
  slashCommands: WorkflowChatSlashCommand[]
  pendingMediaAttachments: PendingMediaAttachment[]
  autoAttachGenerated: boolean
}

/** @deprecated Prefer useWorkflowChatMessages + useWorkflowChatComposerState */
export type WorkflowChatState = WorkflowChatMessagesState &
  WorkflowChatComposerState & {
    messages: UIMessage[]
  }

export type WorkflowChatActions = {
  setText: (value: string) => void
  setSelectedChatModel: (model: ChatGatewayModelId) => void
  setAutoAttachGenerated: (enabled: boolean) => void
  handleTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (message: PromptInputMessage) => Promise<void>
  handleSelectSlashCommand: (command: string) => Promise<void>
  handleSelectMention: (milestoneId: string) => void
  handleSelectVisualizationMention: (
    visualizationId: WorkflowVisualizationId,
    title: string,
  ) => void
  handleSelectMediaMention: (item: MediaCatalogItem) => void
  handleAttachGeneratedImage: (image: { url: string; name: string; mediaS3Key: string }) => void
  handleRemovePendingMedia: (id: string) => void
  handleRetry: () => Promise<void>
  handleClearChat: () => void
  stop: () => void
}

const WorkflowChatMessagesContext = createContext<WorkflowChatMessagesState | null>(null)
const WorkflowChatComposerContext = createContext<WorkflowChatComposerState | null>(null)
const WorkflowChatActionsContext = createContext<WorkflowChatActions | null>(null)

export function WorkflowChatProvider({
  children,
  messagesState,
  composerState,
  actions,
}: {
  children: ReactNode
  messagesState: WorkflowChatMessagesState
  composerState: WorkflowChatComposerState
  actions: WorkflowChatActions
}) {
  return (
    <WorkflowChatMessagesContext value={messagesState}>
      <WorkflowChatComposerContext value={composerState}>
        <WorkflowChatActionsContext value={actions}>{children}</WorkflowChatActionsContext>
      </WorkflowChatComposerContext>
    </WorkflowChatMessagesContext>
  )
}

export function useWorkflowChatMessages(): WorkflowChatMessagesState {
  const ctx = use(WorkflowChatMessagesContext)
  if (!ctx) {
    throw new Error('useWorkflowChatMessages must be used within WorkflowChatProvider')
  }
  return ctx
}

export function useWorkflowChatComposerState(): WorkflowChatComposerState {
  const ctx = use(WorkflowChatComposerContext)
  if (!ctx) {
    throw new Error('useWorkflowChatComposerState must be used within WorkflowChatProvider')
  }
  return ctx
}

/** Status and busy flags for mobile chrome — no message bodies. */
export function useWorkflowChatMeta(): Pick<
  WorkflowChatMessagesState,
  'status' | 'isChatBusy' | 'hasMessages' | 'error'
> {
  const { status, isChatBusy, hasMessages, error } = useWorkflowChatMessages()
  return useMemo(
    () => ({ status, isChatBusy, hasMessages, error }),
    [status, isChatBusy, hasMessages, error],
  )
}

export function useWorkflowChatActions(): WorkflowChatActions {
  const ctx = use(WorkflowChatActionsContext)
  if (!ctx) {
    throw new Error('useWorkflowChatActions must be used within WorkflowChatProvider')
  }
  return ctx
}

/** Convenience hook combining messages + composer slices. */
export function useWorkflowChatState(): WorkflowChatState {
  const messagesState = useWorkflowChatMessages()
  const composerState = useWorkflowChatComposerState()
  return useMemo(
    () => ({
      ...messagesState,
      ...composerState,
      messages: messagesState.visibleMessages,
    }),
    [messagesState, composerState],
  )
}

export { DEFAULT_CHAT_GATEWAY_MODEL }
