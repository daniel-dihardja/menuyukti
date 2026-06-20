'use client'

import type { UIMessage } from 'ai'
import type { PromptInputMessage } from '@workspace/ui/components/ai-elements/prompt-input'
import { createContext, use, type ReactNode } from 'react'

import type { WorkflowChatSlashCommand } from './use-workflow-chat'
import { DEFAULT_CHAT_GATEWAY_MODEL, type ChatGatewayModelId } from '@/lib/chat/gateway-chat-models'

export type WorkflowChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'

export type WorkflowChatState = {
  text: string
  messages: UIMessage[]
  visibleMessages: UIMessage[]
  error: Error | undefined
  status: WorkflowChatStatus
  selectedChatModel: ChatGatewayModelId
  isChatBusy: boolean
  hasMessages: boolean
  isSubmitDisabled: boolean
  slashCommands: WorkflowChatSlashCommand[]
}

export type WorkflowChatActions = {
  setText: (value: string) => void
  setSelectedChatModel: (model: ChatGatewayModelId) => void
  handleTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (message: PromptInputMessage) => Promise<void>
  handleSelectSlashCommand: (command: string) => Promise<void>
  handleSelectMention: (milestoneId: string) => void
  handleRetry: () => Promise<void>
  handleClearChat: () => void
  stop: () => void
}

const WorkflowChatStateContext = createContext<WorkflowChatState | null>(null)
const WorkflowChatActionsContext = createContext<WorkflowChatActions | null>(null)

export function WorkflowChatProvider({
  children,
  state,
  actions,
}: {
  children: ReactNode
  state: WorkflowChatState
  actions: WorkflowChatActions
}) {
  return (
    <WorkflowChatStateContext value={state}>
      <WorkflowChatActionsContext value={actions}>{children}</WorkflowChatActionsContext>
    </WorkflowChatStateContext>
  )
}

export function useWorkflowChatState(): WorkflowChatState {
  const ctx = use(WorkflowChatStateContext)
  if (!ctx) {
    throw new Error('useWorkflowChatState must be used within WorkflowChatProvider')
  }
  return ctx
}

export function useWorkflowChatActions(): WorkflowChatActions {
  const ctx = use(WorkflowChatActionsContext)
  if (!ctx) {
    throw new Error('useWorkflowChatActions must be used within WorkflowChatProvider')
  }
  return ctx
}

export { DEFAULT_CHAT_GATEWAY_MODEL }
